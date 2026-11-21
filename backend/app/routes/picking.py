from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product, InventoryTransaction
from app.models.picking import PickingTask, PickingItem
from app.models.packing import PackingRecord, PackingItem
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity, log_error
from app.routes.orders import transition_status

picking_bp = Blueprint('picking', __name__)

@picking_bp.route('/tasks', methods=['GET'])
@token_required
def get_picking_tasks(current_user):
    status_filter = request.args.get('status')
    picker_id = request.args.get('picker_id')

    # If picker role, default to their tasks unless 'all=true' or manager
    query = PickingTask.query

    if current_user.role.name == 'picker' and not request.args.get('all'):
        query = query.filter(PickingTask.picker_id == current_user.id)
    elif picker_id:
        query = query.filter(PickingTask.picker_id == int(picker_id))

    if status_filter and status_filter != 'ALL':
        query = query.filter(PickingTask.status == status_filter)

    tasks = query.order_by(PickingTask.created_at.desc()).all()
    return jsonify({
        'total': len(tasks),
        'tasks': [t.to_dict() for t in tasks]
    }), 200

@picking_bp.route('/tasks/<int:task_id>', methods=['GET'])
@token_required
def get_picking_task(current_user, task_id):
    task = PickingTask.query.get_or_404(task_id)
    return jsonify({'task': task.to_dict()}), 200

@picking_bp.route('/tasks/<int:task_id>/start', methods=['POST'])
@token_required
def start_picking_task(current_user, task_id):
    task = PickingTask.query.get_or_404(task_id)
    
    if task.status == 'COMPLETED':
        return jsonify({'error': 'Picking task is already completed'}), 400

    if not task.started_at:
        task.started_at = datetime.utcnow()
    task.status = 'IN_PROGRESS'
    if not task.picker_id:
        task.picker_id = current_user.id

    order = task.order
    if order:
        order.picking_started_at = datetime.utcnow()
        transition_status(order, 'Picking In Progress', current_user.id, f"Picker {current_user.full_name} started picking")

    db.session.commit()
    log_activity(
        action='PICKING_STARTED',
        entity_type='PICKING',
        entity_id=task.task_number,
        description=f"Picking task {task.task_number} started by {current_user.full_name}",
        user_id=current_user.id
    )

    return jsonify({'message': 'Picking task started', 'task': task.to_dict()}), 200

@picking_bp.route('/tasks/<int:task_id>/verify-barcode', methods=['POST'])
@token_required
def verify_barcode(current_user, task_id):
    task = PickingTask.query.get_or_404(task_id)
    data = request.get_json() or {}
    picking_item_id = data.get('picking_item_id')
    barcode_entered = data.get('barcode', '').strip()

    if not picking_item_id or not barcode_entered:
        return jsonify({'error': 'picking_item_id and barcode are required'}), 400

    item = PickingItem.query.filter_by(id=picking_item_id, picking_task_id=task.id).first()
    if not item:
        return jsonify({'error': 'Picking item not found in this task'}), 404

    expected_barcode = item.product.barcode

    if barcode_entered != expected_barcode:
        # Flag and log picking error
        log_error(
            error_type='PICKING_ERROR',
            description=f"Barcode mismatch for item {item.product.name} (SKU: {item.product.sku}). Scanned: '{barcode_entered}', Expected: '{expected_barcode}'",
            order_id=task.order_id,
            product_id=item.product_id,
            user_id=current_user.id,
            severity='HIGH'
        )
        return jsonify({
            'valid': False,
            'error': f"Incorrect barcode '{barcode_entered}'. Does not match expected product '{item.product.name}'."
        }), 400

    return jsonify({
        'valid': True,
        'message': f"Barcode validated successfully for {item.product.name}",
        'product': {
            'name': item.product.name,
            'sku': item.product.sku,
            'barcode': item.product.barcode,
            'bin_location': item.bin_location.code if item.bin_location else 'N/A'
        }
    }), 200

@picking_bp.route('/tasks/<int:task_id>/confirm-item', methods=['POST'])
@token_required
def confirm_picked_item(current_user, task_id):
    task = PickingTask.query.get_or_404(task_id)
    data = request.get_json() or {}
    picking_item_id = data.get('picking_item_id')
    picked_qty = int(data.get('picked_qty', 0))
    barcode_scanned = data.get('barcode_scanned', '').strip()

    if not picking_item_id or picked_qty <= 0:
        return jsonify({'error': 'Valid picking_item_id and picked_qty (> 0) are required'}), 400

    item = PickingItem.query.filter_by(id=picking_item_id, picking_task_id=task.id).first()
    if not item:
        return jsonify({'error': 'Picking item not found in this task'}), 404

    # Validation: Do not allow picking more than required ordered quantity
    if picked_qty > item.required_qty:
        return jsonify({
            'error': f"Cannot pick {picked_qty} units. Ordered quantity is only {item.required_qty}"
        }), 400

    # Validation: Verify barcode
    if not barcode_scanned or barcode_scanned != item.product.barcode:
        log_error(
            error_type='PICKING_ERROR',
            description=f"Attempted to confirm item {item.product.sku} with invalid barcode '{barcode_scanned}'",
            order_id=task.order_id,
            product_id=item.product_id,
            user_id=current_user.id,
            severity='HIGH'
        )
        return jsonify({'error': 'Barcode must be verified before confirming picked item'}), 400

    # Update item
    item.picked_qty = picked_qty
    item.barcode_scanned = barcode_scanned
    item.status = 'PICKED'
    item.picked_at = datetime.utcnow()

    # Update order item
    if item.order_item:
        item.order_item.picked_qty = picked_qty
        item.order_item.status = 'PICKED'

    # Recalculate total picked items on task
    task.picked_items = sum(pi.picked_qty for pi in task.items)
    if task.status == 'PENDING':
        task.status = 'IN_PROGRESS'
        if not task.started_at:
            task.started_at = datetime.utcnow()

    db.session.commit()

    log_activity(
        action='ITEM_PICKED',
        entity_type='PICKING',
        entity_id=task.task_number,
        description=f"Picked {picked_qty}/{item.required_qty} units of {item.product.name} (Bin: {item.bin_location.code if item.bin_location else 'N/A'})",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Item picking confirmed',
        'task': task.to_dict()
    }), 200

@picking_bp.route('/tasks/<int:task_id>/report-error', methods=['POST'])
@token_required
def report_picking_error(current_user, task_id):
    task = PickingTask.query.get_or_404(task_id)
    data = request.get_json() or {}
    picking_item_id = data.get('picking_item_id')
    error_type = data.get('error_type', 'MISSING_ITEM') # MISSING_ITEM, DAMAGED_ITEM, SHORTAGE
    description = data.get('description', '').strip()

    if not description:
        return jsonify({'error': 'Description of error is required'}), 400

    item = None
    if picking_item_id:
        item = PickingItem.query.filter_by(id=picking_item_id, picking_task_id=task.id).first()
        if item:
            item.status = 'DAMAGED' if error_type == 'DAMAGED_ITEM' else 'SHORTAGE'
            item.notes = description

    log_error(
        error_type='PICKING_ERROR',
        description=f"[{error_type}] {description}",
        order_id=task.order_id,
        product_id=item.product_id if item else None,
        user_id=current_user.id,
        severity='HIGH'
    )

    db.session.commit()
    return jsonify({'message': 'Picking error reported and logged for warehouse management'}), 200

@picking_bp.route('/tasks/<int:task_id>/complete', methods=['POST'])
@token_required
def complete_picking_task(current_user, task_id):
    task = PickingTask.query.get_or_404(task_id)
    
    # Check if all items are picked or accounted for
    unpicked = [pi for pi in task.items if pi.picked_qty == 0 and pi.status not in ('SHORTAGE', 'DAMAGED')]
    if unpicked:
        return jsonify({
            'error': f"{len(unpicked)} items have not been picked yet. All items must be picked or reported as shortage/damage."
        }), 400

    task.status = 'COMPLETED'
    task.completed_at = datetime.utcnow()
    if not task.picker_id:
        task.picker_id = current_user.id

    order = task.order
    if order:
        order.picked_at = datetime.utcnow()
        transition_status(order, 'Picking Completed', current_user.id, f"Picking completed by {current_user.full_name}")

        # Automatically create or link Packing Record and transition order to Packing Pending
        if not order.packing_record:
            pr = PackingRecord(
                order_id=order.id,
                status='PENDING',
                package_type='Standard Box',
                created_at=datetime.utcnow()
            )
            pr.checklist = {
                'qty_verified': False,
                'condition_verified': False,
                'order_items_confirmed': False,
                'packaging_completed': False,
                'shipping_label_prepared': False
            }
            db.session.add(pr)
            db.session.flush()

            for oi in order.items:
                pki = PackingItem(
                    packing_record_id=pr.id,
                    order_item_id=oi.id,
                    product_id=oi.product_id,
                    verified_qty=0,
                    is_condition_verified=False,
                    status='PENDING'
                )
                db.session.add(pki)

        transition_status(order, 'Packing Pending', current_user.id, "Ready for packing station verification")

    db.session.commit()
    log_activity(
        action='PICKING_COMPLETED',
        entity_type='PICKING',
        entity_id=task.task_number,
        description=f"Picking task {task.task_number} completed. Order moved to Packing station.",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Picking task successfully completed. Order queued for Packing.',
        'task': task.to_dict()
    }), 200
