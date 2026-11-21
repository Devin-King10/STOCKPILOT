from datetime import datetime
from app import db

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    action = db.Column(db.String(80), nullable=False, index=True) # ORDER_CREATED, PICKING_STARTED, PICKING_COMPLETED, PACKING_COMPLETED, DISPATCH_CONFIRMED, INVENTORY_UPDATED, ERROR_LOGGED, etc.
    entity_type = db.Column(db.String(50), nullable=False) # ORDER, PRODUCT, PICKING, PACKING, DISPATCH, USER
    entity_id = db.Column(db.String(80), nullable=True) # e.g. order_id or sku
    description = db.Column(db.Text, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', back_populates='activity_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'System',
            'user_role': self.user.role.name if (self.user and self.user.role) else 'system',
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'description': self.description,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class ErrorRecord(db.Model):
    __tablename__ = 'error_records'

    id = db.Column(db.Integer, primary_key=True)
    error_type = db.Column(db.String(50), nullable=False, index=True) # PICKING_ERROR, PACKING_ERROR, INVENTORY_ERROR, DISPATCH_ERROR
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default='MEDIUM', nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    status = db.Column(db.String(30), default='UNRESOLVED', nullable=False, index=True) # UNRESOLVED, RESOLVED
    resolution_notes = db.Column(db.Text, nullable=True)
    reported_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    resolved_at = db.Column(db.DateTime, nullable=True)

    order = db.relationship('Order', back_populates='errors')
    product = db.relationship('Product')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'error_type': self.error_type,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'System',
            'description': self.description,
            'severity': self.severity,
            'status': self.status,
            'resolution_notes': self.resolution_notes,
            'reported_at': self.reported_at.isoformat() if self.reported_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }
