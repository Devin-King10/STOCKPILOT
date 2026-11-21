import io
import csv
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.picking import PickingTask, PickingItem
from app.models.packing import PackingRecord, PackingItem
from app.models.dispatch import DispatchRecord
from app.models.activity import ActivityLog, ErrorRecord
from app.models.user import User
from app.middleware.auth import token_required, require_roles

analytics_bp = Blueprint('analytics', __name__)

def get_date_cutoff(period):
    now = datetime.utcnow()
    if period == 'today':
        return datetime.combine(now.date(), datetime.min.time())
    elif period == '7d':
        return now - timedelta(days=7)
    elif period == '30d':
        return now - timedelta(days=30)
    return None

@analytics_bp.route('/summary', methods=['GET'])
@token_required
def get_analytics_summary(current_user):
    period = request.args.get('period', 'all')
    cutoff = get_date_cutoff(period)

    order_query = Order.query
    if cutoff:
        order_query = order_query.filter(Order.created_at >= cutoff)

    total_orders = order_query.count()
    dispatched_query = order_query.filter(Order.status.in_(['Dispatched', 'Delivered']))
    dispatched_count = dispatched_query.count()

    # 1. Average Order Cycle Time (Dispatch - Created in hours/minutes)
    dispatched_orders = dispatched_query.filter(Order.dispatched_at.isnot(None)).all()
    cycle_times_min = [o.cycle_time_minutes for o in dispatched_orders if o.cycle_time_minutes is not None]
    avg_cycle_time_min = round(sum(cycle_times_min) / len(cycle_times_min), 1) if cycle_times_min else 0.0
    avg_cycle_time_hours = round(avg_cycle_time_min / 60, 2) if avg_cycle_time_min else 0.0

    # 2. Average Picking Time (Picked - Started in minutes)
    picking_tasks = PickingTask.query.filter(
        PickingTask.status == 'COMPLETED',
        PickingTask.completed_at.isnot(None),
        PickingTask.started_at.isnot(None)
    )
    if cutoff:
        picking_tasks = picking_tasks.filter(PickingTask.created_at >= cutoff)
    pt_list = picking_tasks.all()
    picking_times_min = [
        round((pt.completed_at - pt.started_at).total_seconds() / 60, 1)
        for pt in pt_list
    ]
    avg_picking_time_min = round(sum(picking_times_min) / len(picking_times_min), 1) if picking_times_min else 0.0

    # 3. Average Packing Time (Packed - Started in minutes)
    packing_records = PackingRecord.query.filter(
        PackingRecord.status == 'COMPLETED',
        PackingRecord.completed_at.isnot(None),
        PackingRecord.started_at.isnot(None)
    )
    if cutoff:
        packing_records = packing_records.filter(PackingRecord.created_at >= cutoff)
    pr_list = packing_records.all()
    packing_times_min = [
        round((pr.completed_at - pr.started_at).total_seconds() / 60, 1)
        for pr in pr_list
    ]
    avg_packing_time_min = round(sum(packing_times_min) / len(packing_times_min), 1) if packing_times_min else 0.0

    # 4. Accuracy calculations
    # Picking Accuracy = (Correctly Picked Items / Total Picked Items) * 100
    pick_items_query = db.session.query(db.func.sum(PickingItem.picked_qty))
    if cutoff:
        pick_items_query = pick_items_query.join(PickingTask).filter(PickingTask.created_at >= cutoff)
    total_picked_items = pick_items_query.scalar() or 0

    pick_err_query = ErrorRecord.query.filter_by(error_type='PICKING_ERROR')
    if cutoff:
        pick_err_query = pick_err_query.filter(ErrorRecord.reported_at >= cutoff)
    total_pick_errors = pick_err_query.count()

    picking_accuracy = 100.0
    if total_picked_items > 0:
        picking_accuracy = max(0.0, round(((total_picked_items - total_pick_errors) / total_picked_items) * 100, 1))

    # Packing Accuracy = (Correctly Packed Items / Total Packed Items) * 100
    pack_items_query = db.session.query(db.func.sum(PackingItem.verified_qty))
    if cutoff:
        pack_items_query = pack_items_query.join(PackingRecord).filter(PackingRecord.created_at >= cutoff)
    total_packed_items = pack_items_query.scalar() or 0

    pack_err_query = ErrorRecord.query.filter_by(error_type='PACKING_ERROR')
    if cutoff:
        pack_err_query = pack_err_query.filter(ErrorRecord.reported_at >= cutoff)
    total_pack_errors = pack_err_query.count()

    packing_accuracy = 100.0
    if total_packed_items > 0:
        packing_accuracy = max(0.0, round(((total_packed_items - total_pack_errors) / total_packed_items) * 100, 1))

    # 5. Delayed orders count
    delay_cutoff = datetime.utcnow() - timedelta(hours=24)
    open_statuses = [
        'Order Created', 'Picking Pending', 'Picking In Progress',
        'Picking Completed', 'Packing Pending', 'Packing In Progress',
        'Packing Completed', 'Ready for Dispatch'
    ]
    delayed_orders_count = Order.query.filter(
        Order.status.in_(open_statuses),
        Order.created_at <= delay_cutoff
    ).count()

    # 6. Daily dispatch count (Last 7 days)
    now = datetime.utcnow()
    daily_dispatches = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        start = datetime.combine(day_date, datetime.min.time())
        end = datetime.combine(day_date, datetime.max.time())
        count = DispatchRecord.query.filter(
            DispatchRecord.dispatch_date >= start,
            DispatchRecord.dispatch_date <= end
        ).count()
        daily_dispatches.append({
            'date': day_date.strftime('%b %d'),
            'dispatches': count
        })

    # 7. Employee Fulfilment Performance
    employee_perf = []
    pickers = User.query.filter(User.role.has(name='picker')).all()
    for p in pickers:
        assigned_tasks = PickingTask.query.filter_by(picker_id=p.id).count()
        completed_tasks = PickingTask.query.filter_by(picker_id=p.id, status='COMPLETED').count()
        employee_perf.append({
            'id': p.id,
            'name': p.full_name,
            'role': 'Picker',
            'assigned': assigned_tasks,
            'completed': completed_tasks,
            'completion_rate': round((completed_tasks / assigned_tasks * 100), 1) if assigned_tasks > 0 else 0.0
        })

    packers = User.query.filter(User.role.has(name='packer')).all()
    for pk in packers:
        assigned_pack = PackingRecord.query.filter_by(packer_id=pk.id).count()
        completed_pack = PackingRecord.query.filter_by(packer_id=pk.id, status='COMPLETED').count()
        employee_perf.append({
            'id': pk.id,
            'name': pk.full_name,
            'role': 'Packer',
            'assigned': assigned_pack,
            'completed': completed_pack,
            'completion_rate': round((completed_pack / assigned_pack * 100), 1) if assigned_pack > 0 else 0.0
        })

    return jsonify({
        'period': period,
        'total_orders': total_orders,
        'dispatched_count': dispatched_count,
        'avg_cycle_time_min': avg_cycle_time_min,
        'avg_cycle_time_hours': avg_cycle_time_hours,
        'avg_picking_time_min': avg_picking_time_min,
        'avg_packing_time_min': avg_packing_time_min,
        'picking_accuracy': picking_accuracy,
        'packing_accuracy': packing_accuracy,
        'total_pick_errors': total_pick_errors,
        'total_pack_errors': total_pack_errors,
        'delayed_orders_count': delayed_orders_count,
        'daily_dispatches': daily_dispatches,
        'employee_performance': employee_perf
    }), 200

@analytics_bp.route('/export/<report_type>', methods=['GET'])
@token_required
def export_csv(current_user, report_type):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == 'orders':
        writer.writerow(['Order Number', 'Customer', 'Email', 'Status', 'Priority', 'Total Items', 'Total Amount', 'Created At', 'Dispatched At', 'Cycle Time (Min)'])
        orders = Order.query.order_by(Order.created_at.desc()).all()
        for o in orders:
            writer.writerow([
                o.order_number, o.customer_name, o.customer_email,
                o.status, o.priority, o.total_items, f"${o.total_amount:.2f}",
                o.created_at.strftime('%Y-%m-%d %H:%M') if o.created_at else '',
                o.dispatched_at.strftime('%Y-%m-%d %H:%M') if o.dispatched_at else '',
                o.cycle_time_minutes or 'N/A'
            ])

    elif report_type == 'inventory':
        writer.writerow(['Product Name', 'SKU', 'Barcode', 'Category', 'Available Qty', 'Reserved Qty', 'Total Qty', 'Min Level', 'Unit Price', 'Bin Location', 'Status'])
        products = Product.query.order_by(Product.name.asc()).all()
        for p in products:
            writer.writerow([
                p.name, p.sku, p.barcode, p.category,
                p.available_qty, p.reserved_qty, p.total_qty,
                p.min_stock_level, f"${p.unit_price:.2f}",
                p.bin_location.code if p.bin_location else 'Unassigned',
                p.status
            ])

    elif report_type == 'errors':
        writer.writerow(['ID', 'Error Type', 'Order Number', 'Product SKU', 'Reported By', 'Severity', 'Status', 'Description', 'Reported At', 'Resolved At'])
        errors = ErrorRecord.query.order_by(ErrorRecord.reported_at.desc()).all()
        for e in errors:
            writer.writerow([
                e.id, e.error_type,
                e.order.order_number if e.order else 'N/A',
                e.product.sku if e.product else 'N/A',
                e.user.full_name if e.user else 'System',
                e.severity, e.status, e.description,
                e.reported_at.strftime('%Y-%m-%d %H:%M') if e.reported_at else '',
                e.resolved_at.strftime('%Y-%m-%d %H:%M') if e.resolved_at else ''
            ])

    elif report_type == 'fulfillment':
        writer.writerow(['Task Number', 'Order Number', 'Picker', 'Items Total', 'Items Picked', 'Status', 'Started At', 'Completed At'])
        tasks = PickingTask.query.order_by(PickingTask.created_at.desc()).all()
        for t in tasks:
            writer.writerow([
                t.task_number,
                t.order.order_number if t.order else 'N/A',
                t.picker.full_name if t.picker else 'Unassigned',
                t.total_items, t.picked_items, t.status,
                t.started_at.strftime('%Y-%m-%d %H:%M') if t.started_at else '',
                t.completed_at.strftime('%Y-%m-%d %H:%M') if t.completed_at else ''
            ])
    else:
        return jsonify({'error': 'Invalid report type requested'}), 400

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=stockpilot_{report_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
