from datetime import datetime
from app import db

class DispatchRecord(db.Model):
    __tablename__ = 'dispatch_records'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, unique=True, index=True)
    dispatch_executive_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    courier_name = db.Column(db.String(80), nullable=False) # e.g. FedEx, DHL, UPS, BlueDart
    tracking_number = db.Column(db.String(100), nullable=False, unique=True, index=True)
    shipment_type = db.Column(db.String(50), default='Standard Express')
    shipping_cost = db.Column(db.Float, default=0.0)
    dispatch_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    estimated_delivery_date = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship('Order', back_populates='dispatch_record')
    dispatch_executive = db.relationship('User', back_populates='dispatch_records')

    def to_dict(self):
        order_items = []
        if self.order and self.order.items:
            for item in self.order.items:
                order_items.append({
                    'product_name': item.product.name if item.product else 'Unknown',
                    'sku': item.product.sku if item.product else 'N/A',
                    'quantity': item.quantity,
                    'unit_price': item.unit_price
                })

        return {
            'id': self.id,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'customer_name': self.order.customer_name if self.order else None,
            'customer_email': self.order.customer_email if self.order else None,
            'customer_phone': self.order.customer_phone if self.order else None,
            'shipping_address': self.order.shipping_address if self.order else None,
            'city': self.order.city if self.order else None,
            'postal_code': self.order.postal_code if self.order else None,
            'total_items': self.order.total_items if self.order else 0,
            'total_amount': self.order.total_amount if self.order else 0.0,
            'courier_name': self.courier_name,
            'tracking_number': self.tracking_number,
            'shipment_type': self.shipment_type,
            'shipping_cost': self.shipping_cost,
            'dispatch_date': self.dispatch_date.isoformat() if self.dispatch_date else None,
            'estimated_delivery_date': self.estimated_delivery_date.isoformat() if self.estimated_delivery_date else None,
            'dispatch_executive_id': self.dispatch_executive_id,
            'dispatch_executive_name': self.dispatch_executive.full_name if self.dispatch_executive else 'Unknown',
            'package_dimensions': self.order.packing_record.package_dimensions if (self.order and self.order.packing_record) else None,
            'package_weight': self.order.packing_record.package_weight if (self.order and self.order.packing_record) else None,
            'notes': self.notes,
            'items': order_items,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
