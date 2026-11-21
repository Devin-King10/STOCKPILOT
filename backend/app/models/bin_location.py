from datetime import datetime
from app import db

class BinLocation(db.Model):
    __tablename__ = 'bin_locations'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True) # e.g. A-01-02
    zone = db.Column(db.String(20), nullable=False) # e.g. Zone A, High-Velocity, Cold Storage
    aisle = db.Column(db.String(10), nullable=False) # e.g. 01
    rack = db.Column(db.String(10), nullable=False) # e.g. 01
    shelf = db.Column(db.String(10), nullable=False) # e.g. 02
    max_capacity = db.Column(db.Integer, default=100)
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship('Product', back_populates='bin_location', lazy='dynamic')
    picking_items = db.relationship('PickingItem', back_populates='bin_location', lazy='dynamic')

    def to_dict(self):
        product_count = self.products.count()
        return {
            'id': self.id,
            'code': self.code,
            'zone': self.zone,
            'aisle': self.aisle,
            'rack': self.rack,
            'shelf': self.shelf,
            'max_capacity': self.max_capacity,
            'product_count': product_count,
            'is_active': self.is_active,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
