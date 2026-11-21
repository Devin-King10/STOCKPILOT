from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from app import db
from app.models.order import Order
from app.models.product import Product
from app.models.activity import ActivityLog, ErrorRecord
from app.models.picking import PickingItem
from app.models.packing import PackingItem
from app.middleware.auth import token_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    # Total Orders
    total_orders = Order.query.count()
    
    # Pending Orders
    pending_orders = Order.query.filter(
        Order.status.in_(['Order Created', 'Picking Pending', 'Packing Pending'])
    ).count()

    # Orders Being Picked
    being_picked = Order.query.filter(Order.status == 'Picking In Progress').count()

    # Orders Awaiting Packing
    awaiting_packing = Order.query.filter(
        Order.status.in_(['Picking Completed', 'Packing Pending'])
    ).count()

    # Orders Ready for Dispatch
    ready_for_dispatch = Order.query.filter(Order.status == 'Ready for Dispatch').count()

    # Dispatched Orders
    dispatched_orders = Order.query.filter(
        Order.status.in_(['Dispatched', 'Delivered'])
    ).count()

    # Errors
    picking_errors = ErrorRecord.query.filter_by(error_type='PICKING_ERROR').count()
    packing_errors = ErrorRecord.query.filter_by(error_type='PACKING_ERROR').count()

    # Picking and Packing Accuracy calculations
    total_picked_items = db.session.query(db.func.sum(PickingItem.picked_qty)).scalar() or 0
    # Picking errors count
    picking_accuracy = 100.0
    if total_picked_items > 0:
        picking_accuracy = max(0.0, round(((total_picked_items - picking_errors) / total_picked_items) * 100, 1))

    total_packed_items = db.session.query(db.func.sum(PackingItem.verified_qty)).scalar() or 0
    packing_accuracy = 100.0
    if total_packed_items > 0:
        packing_accuracy = max(0.0, round(((total_packed_items - packing_errors) / total_packed_items) * 100, 1))

    return jsonify({
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'orders_being_picked': being_picked,
        'orders_awaiting_packing': awaiting_packing,
        'orders_ready_for_dispatch': ready_for_dispatch,
        'dispatched_orders': dispatched_orders,
        'picking_errors': picking_errors,
        'packing_errors': packing_errors,
        'picking_accuracy': picking_accuracy,
        'packing_accuracy': packing_accuracy
    }), 200

@dashboard_bp.route('/charts', methods=['GET'])
@token_required
def get_dashboard_charts(current_user):
    now = datetime.utcnow()
    
    # 1. Daily order fulfilment chart (last 7 days)
    daily_fulfillment = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        start = datetime.combine(day_date, datetime.min.time())
        end = datetime.combine(day_date, datetime.max.time())
        
        created = Order.query.filter(Order.created_at >= start, Order.created_at <= end).count()
        dispatched = Order.query.filter(Order.dispatched_at >= start, Order.dispatched_at <= end).count()
        picked = Order.query.filter(Order.picked_at >= start, Order.picked_at <= end).count()
        
        daily_fulfillment.append({
            'date': day_date.strftime('%b %d'),
            'orders_created': created,
            'orders_picked': picked,
            'orders_dispatched': dispatched
        })

    # 2. Order status distribution
    statuses = [
        'Order Created', 'Picking Pending', 'Picking In Progress',
        'Picking Completed', 'Packing Pending', 'Packing In Progress',
        'Packing Completed', 'Ready for Dispatch', 'Dispatched',
        'Delivered', 'On Hold', 'Cancelled'
    ]
    status_distribution = []
    for st in statuses:
        cnt = Order.query.filter_by(status=st).count()
        if cnt > 0:
            status_distribution.append({
                'name': st,
                'value': cnt
            })

    # 3. Accuracy metrics
    total_picked = db.session.query(db.func.sum(PickingItem.picked_qty)).scalar() or 0
    pick_errs = ErrorRecord.query.filter_by(error_type='PICKING_ERROR').count()
    pick_acc = max(0.0, round(((total_picked - pick_errs) / total_picked) * 100, 1)) if total_picked > 0 else 100.0

    total_packed = db.session.query(db.func.sum(PackingItem.verified_qty)).scalar() or 0
    pack_errs = ErrorRecord.query.filter_by(error_type='PACKING_ERROR').count()
    pack_acc = max(0.0, round(((total_packed - pack_errs) / total_packed) * 100, 1)) if total_packed > 0 else 100.0

    accuracy_data = [
        {'process': 'Picking Accuracy', 'rate': pick_acc, 'errors': pick_errs},
        {'process': 'Packing Accuracy', 'rate': pack_acc, 'errors': pack_errs}
    ]

    return jsonify({
        'daily_fulfillment': daily_fulfillment,
        'status_distribution': status_distribution,
        'accuracy_data': accuracy_data
    }), 200

@dashboard_bp.route('/recent-orders', methods=['GET'])
@token_required
def get_recent_orders(current_user):
    orders = Order.query.order_by(Order.created_at.desc()).limit(7).all()
    return jsonify({
        'orders': [o.to_dict(include_items=False) for o in orders]
    }), 200

@dashboard_bp.route('/recent-activities', methods=['GET'])
@token_required
def get_recent_activities(current_user):
    activities = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(8).all()
    return jsonify({
        'activities': [a.to_dict() for a in activities]
    }), 200

@dashboard_bp.route('/delayed-orders', methods=['GET'])
@token_required
def get_delayed_orders(current_user):
    # Orders open for > 24 hours that are not dispatched or delivered
    cutoff = datetime.utcnow() - timedelta(hours=24)
    open_statuses = [
        'Order Created', 'Picking Pending', 'Picking In Progress',
        'Picking Completed', 'Packing Pending', 'Packing In Progress',
        'Packing Completed', 'Ready for Dispatch'
    ]
    delayed = Order.query.filter(
        Order.status.in_(open_statuses),
        Order.created_at <= cutoff
    ).order_by(Order.created_at.asc()).all()

    return jsonify({
        'count': len(delayed),
        'orders': [o.to_dict(include_items=False) for o in delayed]
    }), 200

@dashboard_bp.route('/low-stock-alerts', methods=['GET'])
@token_required
def get_low_stock_alerts(current_user):
    low_stock_items = Product.query.filter(
        Product.available_qty <= Product.min_stock_level
    ).all()
    return jsonify({
        'count': len(low_stock_items),
        'products': [p.to_dict() for p in low_stock_items]
    }), 200
