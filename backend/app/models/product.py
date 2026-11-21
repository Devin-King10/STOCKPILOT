from datetime import datetime
from app import db

class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    sku = db.Column(db.String(50), unique=True, nullable=False, index=True)
    barcode = db.Column(db.String(50), unique=True, nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    available_qty = db.Column(db.Integer, default=0, nullable=False)
    reserved_qty = db.Column(db.Integer, default=0, nullable=False)
    min_stock_level = db.Column(db.Integer, default=10, nullable=False)
    unit_price = db.Column(db.Float, default=0.0, nullable=False)
    bin_location_id = db.Column(db.Integer, db.ForeignKey('bin_locations.id'), nullable=True)
    status = db.Column(db.String(30), default='ACTIVE', nullable=False) # ACTIVE, OUT_OF_STOCK, DISCONTINUED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bin_location = db.relationship('BinLocation', back_populates='products')
    transactions = db.relationship('InventoryTransaction', back_populates='product', cascade='all, delete-orphan', lazy='dynamic')
    order_items = db.relationship('OrderItem', back_populates='product')
    picking_items = db.relationship('PickingItem', back_populates='product')

    @property
    def total_qty(self):
        return (self.available_qty or 0) + (self.reserved_qty or 0)

    @property
    def is_low_stock(self):
        return self.available_qty <= self.min_stock_level

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'barcode': self.barcode,
            'category': self.category,
            'description': self.description,
            'available_qty': self.available_qty,
            'reserved_qty': self.reserved_qty,
            'total_qty': self.total_qty,
            'min_stock_level': self.min_stock_level,
            'unit_price': self.unit_price,
            'bin_location_id': self.bin_location_id,
            'bin_location': self.bin_location.code if self.bin_location else 'Unassigned',
            'bin_zone': self.bin_location.zone if self.bin_location else None,
            'status': self.status,
            'is_low_stock': self.is_low_stock,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class InventoryTransaction(db.Model):
    __tablename__ = 'inventory_transactions'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    transaction_type = db.Column(db.String(30), nullable=False) # IN, OUT, RESERVE, RELEASE, ADJUST, PICK, DAMAGE
    quantity = db.Column(db.Integer, nullable=False)
    previous_quantity = db.Column(db.Integer, nullable=False)
    new_quantity = db.Column(db.Integer, nullable=False)
    reference_id = db.Column(db.String(80), nullable=True) # Order ID, Task ID, etc.
    reference_type = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    product = db.relationship('Product', back_populates='transactions')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'transaction_type': self.transaction_type,
            'quantity': self.quantity,
            'previous_quantity': self.previous_quantity,
            'new_quantity': self.new_quantity,
            'reference_id': self.reference_id,
            'reference_type': self.reference_type,
            'notes': self.notes,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'System',
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
