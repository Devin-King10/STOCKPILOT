import random
from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import Product, InventoryTransaction
from app.models.user import User
from app.models.picking import PickingTask, PickingItem
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity, log_error

orders_bp = Blueprint('orders', __name__)

def transition_status(order, new_status, user_id, notes=None):
    old_status = order.status
    if old_status == new_status:
        return
    order.status = new_status
    order.updated_at = datetime.utcnow()
    
    # Record history
    history = OrderStatusHistory(
        order_id=order.id,
        old_status=old_status,
        new_status=new_status,
        changed_by_user_id=user_id,
        notes=notes,
        timestamp=datetime.utcnow()
    )
    db.session.add(history)

@orders_bp.route('', methods=['GET'])
@token_required
def get_orders(current_user):
    status_filter = request.args.get('status')
    priority_filter = request.args.get('priority')
    search_query = request.args.get('search')
    picker_id = request.args.get('picker_id')

    query = Order.query

    if status_filter and status_filter != 'ALL':
        query = query.filter(Order.status == status_filter)

    if priority_filter and priority_filter != 'ALL':
        query = query.filter(Order.priority == priority_filter)

    if picker_id:
        query = query.filter(Order.assigned_picker_id == int(picker_id))

    if search_query:
        search = f"%{search_query.strip()}%"
        query = query.filter(
            (Order.order_number.ilike(search)) |
            (Order.customer_name.ilike(search)) |
            (Order.customer_email.ilike(search)) |
            (Order.shipping_address.ilike(search))
        )

    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify({
        'total': len(orders),
        'orders': [o.to_dict(include_items=False) for o in orders]
    }), 200

@orders_bp.route('/<int:order_id>', methods=['GET'])
@token_required
def get_order(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify({'order': order.to_dict(include_items=True)}), 200

@orders_bp.route('', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json() or {}
    customer_name = data.get('customer_name', '').strip()
    customer_email = data.get('customer_email', '').strip()
    customer_phone = data.get('customer_phone', '').strip()
    shipping_address = data.get('shipping_address', '').strip()
    city = data.get('city', 'New York').strip()
    postal_code = data.get('postal_code', '10001').strip()
    priority = data.get('priority', 'NORMAL').upper()
    items_data = data.get('items', [])
    assigned_picker_id = data.get('assigned_picker_id')
    notes = data.get('notes', '')

    if not customer_name or not customer_email or not shipping_address:
        return jsonify({'error': 'Customer name, email, and shipping address are required'}), 400

    if not items_data or len(items_data) == 0:
        return jsonify({'error': 'At least one product item must be added to the order'}), 400

    # Generate unique order number
    year = datetime.utcnow().year
    rand_seq = random.randint(1000, 9999)
    order_number = f"ORD-{year}-{rand_seq}"
    while Order.query.filter_by(order_number=order_number).first():
        rand_seq = random.randint(1000, 9999)
        order_number = f"ORD-{year}-{rand_seq}"

    # Calculate total and validate stock availability
    total_amount = 0.0
    total_items = 0
    validated_items = []

    for item in items_data:
        product_id = item.get('product_id')
        qty = int(item.get('quantity', 1))

        if qty <= 0:
            return jsonify({'error': f'Quantity must be greater than 0 for all items'}), 400

        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': f'Product ID {product_id} not found'}), 404

        if product.available_qty < qty:
            return jsonify({
                'error': f"Insufficient stock for '{product.name}'. Available: {product.available_qty}, Requested: {qty}"
            }), 400

        validated_items.append((product, qty))
        total_items += qty
        total_amount += (product.unit_price * qty)

    # Initial status
    initial_status = 'Picking Pending' if assigned_picker_id else 'Order Created'

    order = Order(
        order_number=order_number,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        shipping_address=shipping_address,
        city=city,
        postal_code=postal_code,
        priority=priority,
        status=initial_status,
        assigned_picker_id=assigned_picker_id,
        total_items=total_items,
        total_amount=round(total_amount, 2),
        notes=notes,
        created_at=datetime.utcnow()
    )
    db.session.add(order)
    db.session.flush()

    # Initial status history
    transition_status(order, initial_status, current_user.id, 'Customer order registered in system')

    # Add items & reserve inventory
    order_item_instances = []
    for product, qty in validated_items:
        prev_qty = product.available_qty
        product.available_qty -= qty
        product.reserved_qty += qty

        oi = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=qty,
            unit_price=product.unit_price,
            picked_qty=0,
            packed_qty=0,
            status='PENDING'
        )
        db.session.add(oi)
        order_item_instances.append((oi, product, qty))

        # Inventory transaction
        inv_tx = InventoryTransaction(
            product_id=product.id,
            transaction_type='RESERVE',
            quantity=qty,
            previous_quantity=prev_qty,
            new_quantity=product.available_qty,
            reference_id=order.order_number,
            reference_type='ORDER_RESERVATION',
            notes=f"Stock reserved for order {order.order_number}",
            user_id=current_user.id
        )
        db.session.add(inv_tx)

    db.session.flush()

    # If picker was assigned, create picking task
    if assigned_picker_id:
        pt = PickingTask(
            task_number=f"PICK-{order.order_number}",
            order_id=order.id,
            picker_id=assigned_picker_id,
            status='PENDING',
            total_items=total_items,
            picked_items=0,
            created_at=datetime.utcnow()
        )
        db.session.add(pt)
        db.session.flush()

        for oi, product, qty in order_item_instances:
            pi = PickingItem(
                picking_task_id=pt.id,
                order_item_id=oi.id,
                product_id=product.id,
                bin_location_id=product.bin_location_id,
                required_qty=qty,
                picked_qty=0,
                status='PENDING'
            )
            db.session.add(pi)

    db.session.commit()

    log_activity(
        action='ORDER_CREATED',
        entity_type='ORDER',
        entity_id=order.order_number,
        description=f"Order {order.order_number} created with {total_items} items (Total: ${order.total_amount})",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Order created successfully',
        'order': order.to_dict(include_items=True)
    }), 201

@orders_bp.route('/<int:order_id>', methods=['PUT'])
@token_required
def update_order(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    if order.status in ('Dispatched', 'Delivered', 'Cancelled'):
        return jsonify({'error': f"Cannot modify order in '{order.status}' status"}), 400

    data = request.get_json() or {}
    if 'customer_name' in data:
        order.customer_name = data['customer_name'].strip()
    if 'customer_email' in data:
        order.customer_email = data['customer_email'].strip()
    if 'customer_phone' in data:
        order.customer_phone = data['customer_phone'].strip()
    if 'shipping_address' in data:
        order.shipping_address = data['shipping_address'].strip()
    if 'priority' in data:
        order.priority = data['priority'].upper()
    if 'notes' in data:
        order.notes = data['notes']

    db.session.commit()
    log_activity(
        action='ORDER_UPDATED',
        entity_type='ORDER',
        entity_id=order.order_number,
        description=f"Order details updated by {current_user.full_name}",
        user_id=current_user.id
    )
    return jsonify({'message': 'Order updated successfully', 'order': order.to_dict()}), 200

@orders_bp.route('/<int:order_id>/assign-picker', methods=['POST'])
@token_required
def assign_picker(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    picker_id = data.get('picker_id')

    if not picker_id:
        return jsonify({'error': 'picker_id is required'}), 400

    picker = User.query.get(picker_id)
    if not picker:
        return jsonify({'error': 'Selected picker user does not exist'}), 404

    order.assigned_picker_id = picker.id

    # Create or update picking task
    if not order.picking_task:
        pt = PickingTask(
            task_number=f"PICK-{order.order_number}",
            order_id=order.id,
            picker_id=picker.id,
            status='PENDING',
            total_items=order.total_items,
            picked_items=0,
            created_at=datetime.utcnow()
        )
        db.session.add(pt)
        db.session.flush()

        for oi in order.items:
            pi = PickingItem(
                picking_task_id=pt.id,
                order_item_id=oi.id,
                product_id=oi.product_id,
                bin_location_id=oi.product.bin_location_id if oi.product else None,
                required_qty=oi.quantity,
                picked_qty=0,
                status='PENDING'
            )
            db.session.add(pi)
    else:
        order.picking_task.picker_id = picker.id

    if order.status == 'Order Created':
        transition_status(order, 'Picking Pending', current_user.id, f"Assigned to picker {picker.full_name}")

    db.session.commit()
    log_activity(
        action='PICKER_ASSIGNED',
        entity_type='ORDER',
        entity_id=order.order_number,
        description=f"Assigned picker {picker.full_name} to order {order.order_number}",
        user_id=current_user.id
    )

    return jsonify({
        'message': f"Order assigned to picker {picker.full_name}",
        'order': order.to_dict(include_items=True)
    }), 200

@orders_bp.route('/<int:order_id>/hold', methods=['POST'])
@token_required
def hold_order(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    notes = data.get('notes', 'Placed on hold by supervisor')

    if order.status in ('Dispatched', 'Delivered', 'Cancelled'):
        return jsonify({'error': f"Cannot hold an order in '{order.status}' status"}), 400

    transition_status(order, 'On Hold', current_user.id, notes)
    db.session.commit()
    log_activity(
        action='ORDER_HELD',
        entity_type='ORDER',
        entity_id=order.order_number,
        description=f"Order placed on hold: {notes}",
        user_id=current_user.id
    )
    return jsonify({'message': 'Order placed on hold', 'order': order.to_dict()}), 200

@orders_bp.route('/<int:order_id>/resume', methods=['POST'])
@token_required
def resume_order(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    if order.status != 'On Hold':
        return jsonify({'error': 'Only orders on hold can be resumed'}), 400

    # Determine previous status from history or default to appropriate workflow step
    resumed_status = 'Picking Pending'
    if order.status_history:
        for hist in order.status_history:
            if hist.old_status and hist.old_status != 'On Hold':
                resumed_status = hist.old_status
                break

    transition_status(order, resumed_status, current_user.id, 'Resumed from On Hold')
    db.session.commit()
    log_activity(
        action='ORDER_RESUMED',
        entity_type='ORDER',
        entity_id=order.order_number,
        description=f"Order resumed to status {resumed_status}",
        user_id=current_user.id
    )
    return jsonify({'message': 'Order resumed', 'order': order.to_dict()}), 200

@orders_bp.route('/<int:order_id>/cancel', methods=['POST'])
@token_required
def cancel_order(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    if order.status in ('Dispatched', 'Delivered', 'Cancelled'):
        return jsonify({'error': f"Cannot cancel order in '{order.status}' status"}), 400

    data = request.get_json() or {}
    notes = data.get('notes', 'Cancelled by user')

    # Release reserved inventory
    for oi in order.items:
        prod = oi.product
        if prod:
            prev_qty = prod.available_qty
            prod.available_qty += oi.quantity
            prod.reserved_qty = max(0, prod.reserved_qty - oi.quantity)

            inv_tx = InventoryTransaction(
                product_id=prod.id,
                transaction_type='RELEASE',
                quantity=oi.quantity,
                previous_quantity=prev_qty,
                new_quantity=prod.available_qty,
                reference_id=order.order_number,
                reference_type='ORDER_CANCELLATION',
                notes=f"Stock released due to cancellation of order {order.order_number}",
                user_id=current_user.id
            )
            db.session.add(inv_tx)

    transition_status(order, 'Cancelled', current_user.id, notes)
    if order.picking_task:
        order.picking_task.status = 'CANCELLED'

    db.session.commit()
    log_activity(
        action='ORDER_CANCELLED',
        entity_type='ORDER',
        entity_id=order.order_number,
        description=f"Order {order.order_number} cancelled: {notes}",
        user_id=current_user.id
    )

    return jsonify({'message': 'Order cancelled and stock released', 'order': order.to_dict()}), 200
