from datetime import datetime
from app import db

class PickingTask(db.Model):
    __tablename__ = 'picking_tasks'

    id = db.Column(db.Integer, primary_key=True)
    task_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, unique=True, index=True)
    picker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    status = db.Column(db.String(30), default='PENDING', nullable=False) # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    total_items = db.Column(db.Integer, default=0)
    picked_items = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship('Order', back_populates='picking_task')
    picker = db.relationship('User', back_populates='picking_tasks')
    items = db.relationship('PickingItem', back_populates='picking_task', cascade='all, delete-orphan')

    @property
    def progress_percentage(self):
        if not self.total_items or self.total_items == 0:
            return 0
        return round((self.picked_items / self.total_items) * 100, 1)

    def to_dict(self):
        return {
            'id': self.id,
            'task_number': self.task_number,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'customer_name': self.order.customer_name if self.order else None,
            'priority': self.order.priority if self.order else 'NORMAL',
            'picker_id': self.picker_id,
            'picker_name': self.picker.full_name if self.picker else 'Unassigned',
            'status': self.status,
            'total_items': self.total_items,
            'picked_items': self.picked_items,
            'progress_percentage': self.progress_percentage,
            'notes': self.notes,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'items': [item.to_dict() for item in self.items]
        }

class PickingItem(db.Model):
    __tablename__ = 'picking_items'

    id = db.Column(db.Integer, primary_key=True)
    picking_task_id = db.Column(db.Integer, db.ForeignKey('picking_tasks.id'), nullable=False, index=True)
    order_item_id = db.Column(db.Integer, db.ForeignKey('order_items.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    bin_location_id = db.Column(db.Integer, db.ForeignKey('bin_locations.id'), nullable=True)
    required_qty = db.Column(db.Integer, nullable=False)
    picked_qty = db.Column(db.Integer, default=0, nullable=False)
    barcode_scanned = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(30), default='PENDING', nullable=False) # PENDING, PICKED, SHORTAGE, DAMAGED
    notes = db.Column(db.String(255), nullable=True)
    picked_at = db.Column(db.DateTime, nullable=True)

    picking_task = db.relationship('PickingTask', back_populates='items')
    order_item = db.relationship('OrderItem')
    product = db.relationship('Product', back_populates='picking_items')
    bin_location = db.relationship('BinLocation', back_populates='picking_items')

    def to_dict(self):
        return {
            'id': self.id,
            'picking_task_id': self.picking_task_id,
            'order_item_id': self.order_item_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'sku': self.product.sku if self.product else None,
            'barcode': self.product.barcode if self.product else None,
            'bin_location_code': self.bin_location.code if self.bin_location else 'Unassigned',
            'bin_zone': self.bin_location.zone if self.bin_location else None,
            'available_qty': self.product.available_qty if self.product else 0,
            'required_qty': self.required_qty,
            'picked_qty': self.picked_qty,
            'barcode_scanned': self.barcode_scanned,
            'status': self.status,
            'notes': self.notes,
            'picked_at': self.picked_at.isoformat() if self.picked_at else None
        }
