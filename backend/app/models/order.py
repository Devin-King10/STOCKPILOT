from datetime import datetime
from app import db

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    customer_name = db.Column(db.String(120), nullable=False)
    customer_email = db.Column(db.String(120), nullable=False)
    customer_phone = db.Column(db.String(30), nullable=True)
    shipping_address = db.Column(db.Text, nullable=False)
    city = db.Column(db.String(60), default='Metropolis')
    postal_code = db.Column(db.String(20), default='10001')
    priority = db.Column(db.String(20), default='NORMAL', nullable=False) # LOW, NORMAL, HIGH, URGENT
    status = db.Column(db.String(40), default='Order Created', nullable=False, index=True)
    assigned_picker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    total_items = db.Column(db.Integer, default=0)
    total_amount = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text, nullable=True)
    
    # Timestamps for cycle time and audit
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    picking_started_at = db.Column(db.DateTime, nullable=True)
    picked_at = db.Column(db.DateTime, nullable=True)
    packing_started_at = db.Column(db.DateTime, nullable=True)
    packed_at = db.Column(db.DateTime, nullable=True)
    dispatched_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    assigned_picker = db.relationship('User', foreign_keys=[assigned_picker_id])
    items = db.relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')
    picking_task = db.relationship('PickingTask', back_populates='order', uselist=False, cascade='all, delete-orphan')
    packing_record = db.relationship('PackingRecord', back_populates='order', uselist=False, cascade='all, delete-orphan')
    dispatch_record = db.relationship('DispatchRecord', back_populates='order', uselist=False, cascade='all, delete-orphan')
    status_history = db.relationship('OrderStatusHistory', back_populates='order', cascade='all, delete-orphan', order_by='OrderStatusHistory.timestamp.desc()')
    errors = db.relationship('ErrorRecord', back_populates='order', cascade='all, delete-orphan')

    @property
    def cycle_time_minutes(self):
        if self.dispatched_at and self.created_at:
            delta = self.dispatched_at - self.created_at
            return round(delta.total_seconds() / 60, 1)
        return None

    @property
    def picking_duration_minutes(self):
        if self.picked_at and self.picking_started_at:
            delta = self.picked_at - self.picking_started_at
            return round(delta.total_seconds() / 60, 1)
        return None

    @property
    def packing_duration_minutes(self):
        if self.packed_at and self.packing_started_at:
            delta = self.packed_at - self.packing_started_at
            return round(delta.total_seconds() / 60, 1)
        return None

    def to_dict(self, include_items=True):
        data = {
            'id': self.id,
            'order_number': self.order_number,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'shipping_address': self.shipping_address,
            'city': self.city,
            'postal_code': self.postal_code,
            'priority': self.priority,
            'status': self.status,
            'assigned_picker_id': self.assigned_picker_id,
            'assigned_picker_name': self.assigned_picker.full_name if self.assigned_picker else None,
            'total_items': self.total_items,
            'total_amount': self.total_amount,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'picking_started_at': self.picking_started_at.isoformat() if self.picking_started_at else None,
            'picked_at': self.picked_at.isoformat() if self.picked_at else None,
            'packing_started_at': self.packing_started_at.isoformat() if self.packing_started_at else None,
            'packed_at': self.packed_at.isoformat() if self.packed_at else None,
            'dispatched_at': self.dispatched_at.isoformat() if self.dispatched_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'cycle_time_minutes': self.cycle_time_minutes,
            'picking_duration_minutes': self.picking_duration_minutes,
            'packing_duration_minutes': self.packing_duration_minutes,
            'has_errors': len(self.errors) > 0
        }
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
            data['status_history'] = [sh.to_dict() for sh in self.status_history]
            if self.dispatch_record:
                data['dispatch_info'] = self.dispatch_record.to_dict()
            if self.packing_record:
                data['packing_info'] = self.packing_record.to_dict()
        return data

class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, default=0.0, nullable=False)
    picked_qty = db.Column(db.Integer, default=0, nullable=False)
    packed_qty = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.String(30), default='PENDING', nullable=False) # PENDING, PICKED, PACKED, SHORTAGE, DAMAGED

    order = db.relationship('Order', back_populates='items')
    product = db.relationship('Product', back_populates='order_items')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'sku': self.product.sku if self.product else None,
            'barcode': self.product.barcode if self.product else None,
            'bin_location': self.product.bin_location.code if (self.product and self.product.bin_location) else 'Unassigned',
            'bin_zone': self.product.bin_location.zone if (self.product and self.product.bin_location) else None,
            'available_qty': self.product.available_qty if self.product else 0,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': round(self.quantity * self.unit_price, 2),
            'picked_qty': self.picked_qty,
            'packed_qty': self.packed_qty,
            'status': self.status
        }

class OrderStatusHistory(db.Model):
    __tablename__ = 'order_status_history'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    old_status = db.Column(db.String(40), nullable=True)
    new_status = db.Column(db.String(40), nullable=False)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    order = db.relationship('Order', back_populates='status_history')
    changed_by = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'changed_by_user_id': self.changed_by_user_id,
            'changed_by_name': self.changed_by.full_name if self.changed_by else 'System',
            'notes': self.notes,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
