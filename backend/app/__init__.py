from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS for frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
        }
    })

    with app.app_context():
        # Import models so SQLAlchemy creates tables
        from app.models import (
            User, Role, Product, BinLocation, InventoryTransaction,
            Order, OrderItem, PickingTask, PickingItem,
            PackingRecord, PackingItem, DispatchRecord,
            OrderStatusHistory, ActivityLog, ErrorRecord
        )
        
        # Register Blueprints
        from app.routes.auth import auth_bp
        from app.routes.dashboard import dashboard_bp
        from app.routes.orders import orders_bp
        from app.routes.inventory import inventory_bp
        from app.routes.picking import picking_bp
        from app.routes.packing import packing_bp
        from app.routes.dispatch import dispatch_bp
        from app.routes.analytics import analytics_bp
        from app.routes.users import users_bp
        from app.routes.activity import activity_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
        app.register_blueprint(orders_bp, url_prefix='/api/orders')
        app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
        app.register_blueprint(picking_bp, url_prefix='/api/picking')
        app.register_blueprint(packing_bp, url_prefix='/api/packing')
        app.register_blueprint(dispatch_bp, url_prefix='/api/dispatch')
        app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(activity_bp, url_prefix='/api/activity')
        
        # Health check endpoint
        @app.route('/api/health', methods=['GET'])
        def health_check():
            return {
                "status": "healthy",
                "service": "StockPilot Warehouse API",
                "version": "1.0.0"
            }, 200

        # Auto-create tables if they don't exist
        db.create_all()

    return app
