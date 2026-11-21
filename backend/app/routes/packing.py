from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from app.models.order import Order, OrderItem
from app.models.packing import PackingRecord, PackingItem
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity, log_error
from app.routes.orders import transition_status

packing_bp = Blueprint('packing', __name__)

@packing_bp.route('/tasks', methods=['GET'])
@token_required
def get_packing_tasks(current_user):
    # Orders that are in packing stages
    status_filter = request.args.get('status')
    
    query = PackingRecord.query.join(Order).filter(
        Order.status.in_(['Picking Completed', 'Packing Pending', 'Packing In Progress', 'Packing Completed'])
    )

    if status_filter and status_filter != 'ALL':
        query = query.filter(PackingRecord.status == status_filter)

    records = query.order_by(Order.priority.desc(), PackingRecord.created_at.desc()).all()
    return jsonify({
        'total': len(records),
        'tasks': [r.to_dict() for r in records]
    }), 200

@packing_bp.route('/tasks/<int:record_id>', methods=['GET'])
@token_required
def get_packing_task(current_user, record_id):
    record = PackingRecord.query.get_or_404(record_id)
    return jsonify({'task': record.to_dict()}), 200

@packing_bp.route('/tasks/<int:record_id>/start', methods=['POST'])
@token_required
def start_packing(current_user, record_id):
    record = PackingRecord.query.get_or_404(record_id)
    if record.status == 'COMPLETED':
        return jsonify({'error': 'Packing already completed'}), 400

    if not record.started_at:
        record.started_at = datetime.utcnow()
    record.status = 'IN_PROGRESS'
    record.packer_id = current_user.id

    order = record.order
    if order:
        order.packing_started_at = datetime.utcnow()
        transition_status(order, 'Packing In Progress', current_user.id, f"Packer {current_user.full_name} started packing verification")

    db.session.commit()
    log_activity(
        action='PACKING_STARTED',
        entity_type='PACKING',
        entity_id=record.id,
        description=f"Packing inspection started for order {order.order_number if order else record.id} by {current_user.full_name}",
        user_id=current_user.id
    )

    return jsonify({'message': 'Packing started', 'task': record.to_dict()}), 200

@packing_bp.route('/tasks/<int:record_id>/verify-item', methods=['POST'])
@token_required
def verify_packing_item(current_user, record_id):
    record = PackingRecord.query.get_or_404(record_id)
    data = request.get_json() or {}
    packing_item_id = data.get('packing_item_id')
    verified_qty = int(data.get('verified_qty', 0))
    condition_verified = bool(data.get('is_condition_verified', True))

    item = PackingItem.query.filter_by(id=packing_item_id, packing_record_id=record.id).first()
    if not item:
        return jsonify({'error': 'Packing item not found'}), 404

    target_qty = item.order_item.quantity if item.order_item else 0
    if verified_qty > target_qty:
        return jsonify({'error': f"Verified quantity ({verified_qty}) cannot exceed ordered quantity ({target_qty})"}), 400

    item.verified_qty = verified_qty
    item.is_condition_verified = condition_verified
    item.status = 'VERIFIED' if verified_qty == target_qty and condition_verified else 'PENDING'

    if item.order_item:
        item.order_item.packed_qty = verified_qty
        if item.status == 'VERIFIED':
            item.order_item.status = 'PACKED'

    db.session.commit()
    return jsonify({'message': 'Item verification saved', 'task': record.to_dict()}), 200

@packing_bp.route('/tasks/<int:record_id>/checklist', methods=['PUT'])
@token_required
def update_checklist(current_user, record_id):
    record = PackingRecord.query.get_or_404(record_id)
    data = request.get_json() or {}
    checklist_update = data.get('checklist', {})

    current_cl = record.checklist
    current_cl.update(checklist_update)
    record.checklist = current_cl

    if 'package_dimensions' in data:
        record.package_dimensions = data['package_dimensions']
    if 'package_weight' in data:
        record.package_weight = float(data['package_weight'])
    if 'package_type' in data:
        record.package_type = data['package_type']

    db.session.commit()
    return jsonify({
        'message': 'Checklist updated',
        'checklist': record.checklist,
        'is_checklist_complete': record.is_checklist_complete,
        'task': record.to_dict()
    }), 200

@packing_bp.route('/tasks/<int:record_id>/report-error', methods=['POST'])
@token_required
def report_packing_error(current_user, record_id):
    record = PackingRecord.query.get_or_404(record_id)
    data = request.get_json() or {}
    description = data.get('description', '').strip()
    product_id = data.get('product_id')
    severity = data.get('severity', 'MEDIUM')

    if not description:
        return jsonify({'error': 'Description is required'}), 400

    log_error(
        error_type='PACKING_ERROR',
        description=description,
        order_id=record.order_id,
        product_id=product_id,
        user_id=current_user.id,
        severity=severity
    )

    db.session.commit()
    return jsonify({'message': 'Packing error logged and reported'}), 200

@packing_bp.route('/tasks/<int:record_id>/complete', methods=['POST'])
@token_required
def complete_packing(current_user, record_id):
    record = PackingRecord.query.get_or_404(record_id)
    data = request.get_json() or {}

    dimensions = data.get('package_dimensions') or record.package_dimensions
    weight = data.get('package_weight') or record.package_weight

    if not dimensions or not weight:
        return jsonify({'error': 'Package dimensions and weight (kg) are required to complete packing'}), 400

    record.package_dimensions = dimensions
    record.package_weight = float(weight)

    # Validate that checklist is 100% complete
    # If client passed updated checklist in payload, apply it first
    if 'checklist' in data:
        cl = record.checklist
        cl.update(data['checklist'])
        record.checklist = cl

    if not record.is_checklist_complete:
        return jsonify({
            'error': 'Cannot complete packing. All 5 mandatory checklist verifications must be completed.'
        }), 400

    record.status = 'COMPLETED'
    record.completed_at = datetime.utcnow()
    if not record.packer_id:
        record.packer_id = current_user.id

    order = record.order
    if order:
        order.packed_at = datetime.utcnow()
        transition_status(order, 'Packing Completed', current_user.id, f"Packed by {current_user.full_name}")
        transition_status(order, 'Ready for Dispatch', current_user.id, "Package weighed, sealed, and staged in Dispatch Bay")

    db.session.commit()
    log_activity(
        action='PACKING_COMPLETED',
        entity_type='PACKING',
        entity_id=record.id,
        description=f"Order {order.order_number if order else record.id} packed and staged for Dispatch ({dimensions}, {weight}kg)",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Packing completed successfully! Order is ready for dispatch.',
        'task': record.to_dict()
    }), 200
