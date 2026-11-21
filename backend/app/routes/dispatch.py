from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from app import db
from app.models.order import Order
from app.models.dispatch import DispatchRecord
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity, log_error
from app.routes.orders import transition_status

dispatch_bp = Blueprint('dispatch', __name__)

@dispatch_bp.route('', methods=['GET'])
@token_required
def get_dispatch_queue(current_user):
    tab = request.args.get('tab', 'ready') # 'ready', 'history'
    search = request.args.get('search')

    if tab == 'ready':
        query = Order.query.filter(Order.status == 'Ready for Dispatch')
        if search:
            s = f"%{search.strip()}%"
            query = query.filter((Order.order_number.ilike(s)) | (Order.customer_name.ilike(s)))
        orders = query.order_by(Order.priority.desc(), Order.packed_at.asc()).all()
        return jsonify({
            'total': len(orders),
            'orders': [o.to_dict(include_items=True) for o in orders]
        }), 200

    else: # history
        query = DispatchRecord.query.join(Order)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (DispatchRecord.tracking_number.ilike(s)) |
                (DispatchRecord.courier_name.ilike(s)) |
                (Order.order_number.ilike(s)) |
                (Order.customer_name.ilike(s))
            )
        records = query.order_by(DispatchRecord.dispatch_date.desc()).all()
        return jsonify({
            'total': len(records),
            'dispatches': [r.to_dict() for r in records]
        }), 200

@dispatch_bp.route('/confirm', methods=['POST'])
@token_required
def confirm_dispatch(current_user):
    data = request.get_json() or {}
    order_id = data.get('order_id')
    courier_name = data.get('courier_name', '').strip()
    tracking_number = data.get('tracking_number', '').strip()
    shipment_type = data.get('shipment_type', 'Standard Express').strip()
    shipping_cost = float(data.get('shipping_cost', 0.0))
    notes = data.get('notes', '')

    if not order_id or not courier_name or not tracking_number:
        return jsonify({'error': 'Order ID, Courier Name, and Tracking Number are required'}), 400

    order = Order.query.get_or_404(order_id)
    if order.status != 'Ready for Dispatch':
        return jsonify({'error': f"Order cannot be dispatched from status '{order.status}'. Must be 'Ready for Dispatch'."}), 400

    # Ensure tracking number uniqueness
    if DispatchRecord.query.filter_by(tracking_number=tracking_number).first():
        return jsonify({'error': f"Tracking number '{tracking_number}' already exists in records"}), 409

    now = datetime.utcnow()
    est_delivery = now + timedelta(days=2)

    dispatch_record = DispatchRecord(
        order_id=order.id,
        dispatch_executive_id=current_user.id,
        courier_name=courier_name,
        tracking_number=tracking_number,
        shipment_type=shipment_type,
        shipping_cost=shipping_cost,
        dispatch_date=now,
        estimated_delivery_date=est_delivery,
        notes=notes
    )
    db.session.add(dispatch_record)

    order.dispatched_at = now
    transition_status(order, 'Dispatched', current_user.id, f"Dispatched via {courier_name} (Tracking: {tracking_number})")

    db.session.commit()

    log_activity(
        action='DISPATCH_CONFIRMED',
        entity_type='DISPATCH',
        entity_id=order.order_number,
        description=f"Order {order.order_number} handed over to {courier_name} (Tracking #{tracking_number}) by {current_user.full_name}",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Order successfully dispatched!',
        'dispatch': dispatch_record.to_dict()
    }), 200

@dispatch_bp.route('/summary/<int:order_id>', methods=['GET'])
@token_required
def get_printable_summary(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    if not order.dispatch_record and order.status not in ('Dispatched', 'Delivered', 'Ready for Dispatch'):
        return jsonify({'error': 'Dispatch summary is only available for packed/dispatched orders'}), 400

    dr = order.dispatch_record
    summary = {
        'order_id': order.id,
        'order_number': order.order_number,
        'customer_name': order.customer_name,
        'customer_email': order.customer_email,
        'customer_phone': order.customer_phone,
        'shipping_address': order.shipping_address,
        'city': order.city,
        'postal_code': order.postal_code,
        'total_items': order.total_items,
        'total_amount': order.total_amount,
        'courier_name': dr.courier_name if dr else 'Pending Carrier Assignment',
        'tracking_number': dr.tracking_number if dr else 'PENDING',
        'shipment_type': dr.shipment_type if dr else 'Express',
        'dispatch_date': dr.dispatch_date.strftime('%Y-%m-%d %H:%M UTC') if (dr and dr.dispatch_date) else 'Pending',
        'dispatch_executive': dr.dispatch_executive.full_name if (dr and dr.dispatch_executive) else current_user.full_name,
        'package_dimensions': order.packing_record.package_dimensions if order.packing_record else 'N/A',
        'package_weight': order.packing_record.package_weight if order.packing_record else 0.0,
        'items': [
            {
                'product_name': oi.product.name if oi.product else 'Unknown',
                'sku': oi.product.sku if oi.product else 'N/A',
                'quantity': oi.quantity,
                'unit_price': oi.unit_price,
                'total_price': round(oi.quantity * oi.unit_price, 2)
            } for oi in order.items
        ]
    }
    return jsonify({'summary': summary}), 200

@dispatch_bp.route('/<int:order_id>/deliver', methods=['POST'])
@token_required
def mark_delivered(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    if order.status != 'Dispatched':
        return jsonify({'error': 'Only dispatched orders can be marked as delivered'}), 400

    order.delivered_at = datetime.utcnow()
    transition_status(order, 'Delivered', current_user.id, "Carrier confirmed final delivery to customer")

    db.session.commit()
    log_activity(
        action='ORDER_DELIVERED',
        entity_type='DISPATCH',
        entity_id=order.order_number,
        description=f"Delivery confirmed for order {order.order_number}",
        user_id=current_user.id
    )

    return jsonify({'message': 'Order marked as delivered', 'order': order.to_dict()}), 200
