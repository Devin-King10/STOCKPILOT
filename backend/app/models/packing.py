import json
from datetime import datetime
from app import db

class PackingRecord(db.Model):
    __tablename__ = 'packing_records'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, unique=True, index=True)
    packer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    status = db.Column(db.String(30), default='PENDING', nullable=False) # PENDING, IN_PROGRESS, COMPLETED
    package_dimensions = db.Column(db.String(50), nullable=True) # e.g. 30x20x15 cm
    package_weight = db.Column(db.Float, nullable=True) # in kg
    package_type = db.Column(db.String(50), default='Standard Box') # Standard Box, Fragile Padded, Envelope, Pallet
    checklist_json = db.Column(db.Text, default='{}')
    notes = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship('Order', back_populates='packing_record')
    packer = db.relationship('User', back_populates='packing_records')
    items = db.relationship('PackingItem', back_populates='packing_record', cascade='all, delete-orphan')

    @property
    def checklist(self):
        try:
            return json.loads(self.checklist_json or '{}')
        except Exception:
            return {}

    @checklist.setter
    def checklist(self, value):
        self.checklist_json = json.dumps(value)

    @property
    def is_checklist_complete(self):
        cl = self.checklist
        required_keys = [
            'qty_verified',
            'condition_verified',
            'order_items_confirmed',
            'packaging_completed',
            'shipping_label_prepared'
        ]
        return all(cl.get(k) is True for k in required_keys)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'customer_name': self.order.customer_name if self.order else None,
            'priority': self.order.priority if self.order else 'NORMAL',
            'packer_id': self.packer_id,
            'packer_name': self.packer.full_name if self.packer else 'Unassigned',
            'status': self.status,
            'package_dimensions': self.package_dimensions,
            'package_weight': self.package_weight,
            'package_type': self.package_type,
            'checklist': self.checklist,
            'is_checklist_complete': self.is_checklist_complete,
            'notes': self.notes,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'items': [item.to_dict() for item in self.items]
        }

class PackingItem(db.Model):
    __tablename__ = 'packing_items'

    id = db.Column(db.Integer, primary_key=True)
    packing_record_id = db.Column(db.Integer, db.ForeignKey('packing_records.id'), nullable=False, index=True)
    order_item_id = db.Column(db.Integer, db.ForeignKey('order_items.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    verified_qty = db.Column(db.Integer, default=0, nullable=False)
    is_condition_verified = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(30), default='PENDING', nullable=False) # PENDING, VERIFIED, DAMAGED, MISSING
    notes = db.Column(db.String(255), nullable=True)

    packing_record = db.relationship('PackingRecord', back_populates='items')
    order_item = db.relationship('OrderItem')
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id,
            'packing_record_id': self.packing_record_id,
            'order_item_id': self.order_item_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'sku': self.product.sku if self.product else None,
            'ordered_qty': self.order_item.quantity if self.order_item else 0,
            'picked_qty': self.order_item.picked_qty if self.order_item else 0,
            'verified_qty': self.verified_qty,
            'is_condition_verified': self.is_condition_verified,
            'status': self.status,
            'notes': self.notes
        }
