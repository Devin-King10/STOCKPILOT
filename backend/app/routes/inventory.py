from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from app.models.product import Product, InventoryTransaction
from app.models.bin_location import BinLocation
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity, log_error

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/products', methods=['GET'])
@token_required
def get_products(current_user):
    category = request.args.get('category')
    low_stock = request.args.get('low_stock')
    search = request.args.get('search')
    bin_id = request.args.get('bin_location_id')

    query = Product.query

    if category and category != 'ALL':
        query = query.filter(Product.category == category)

    if low_stock and low_stock.lower() in ('true', '1'):
        query = query.filter(Product.available_qty <= Product.min_stock_level)

    if bin_id:
        query = query.filter(Product.bin_location_id == int(bin_id))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Product.name.ilike(search_term)) |
            (Product.sku.ilike(search_term)) |
            (Product.barcode.ilike(search_term)) |
            (Product.category.ilike(search_term))
        )

    products = query.order_by(Product.name.asc()).all()
    categories = [c[0] for c in db.session.query(Product.category).distinct().all()]

    return jsonify({
        'total': len(products),
        'categories': categories,
        'products': [p.to_dict() for p in products]
    }), 200

@inventory_bp.route('/products/<int:product_id>', methods=['GET'])
@token_required
def get_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    transactions = product.transactions.order_by(InventoryTransaction.timestamp.desc()).limit(30).all()
    
    data = product.to_dict()
    data['transactions'] = [t.to_dict() for t in transactions]
    return jsonify({'product': data}), 200

@inventory_bp.route('/products', methods=['POST'])
@token_required
@require_roles('manager')
def create_product(current_user):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    sku = data.get('sku', '').strip().upper()
    barcode = data.get('barcode', '').strip()
    category = data.get('category', '').strip()
    description = data.get('description', '').strip()
    available_qty = int(data.get('available_qty', 0))
    min_stock_level = int(data.get('min_stock_level', 10))
    unit_price = float(data.get('unit_price', 0.0))
    bin_location_id = data.get('bin_location_id')

    if not name or not sku or not barcode or not category:
        return jsonify({'error': 'Name, SKU, Barcode, and Category are required'}), 400

    if Product.query.filter_by(sku=sku).first():
        return jsonify({'error': f"Product with SKU '{sku}' already exists"}), 409

    if Product.query.filter_by(barcode=barcode).first():
        return jsonify({'error': f"Product with barcode '{barcode}' already exists"}), 409

    product = Product(
        name=name,
        sku=sku,
        barcode=barcode,
        category=category,
        description=description,
        available_qty=available_qty,
        reserved_qty=0,
        min_stock_level=min_stock_level,
        unit_price=unit_price,
        bin_location_id=bin_location_id,
        status='ACTIVE'
    )
    db.session.add(product)
    db.session.flush()

    if available_qty > 0:
        inv_tx = InventoryTransaction(
            product_id=product.id,
            transaction_type='IN',
            quantity=available_qty,
            previous_quantity=0,
            new_quantity=available_qty,
            reference_type='INITIAL_STOCK',
            notes='Initial stock intake on product creation',
            user_id=current_user.id
        )
        db.session.add(inv_tx)

    db.session.commit()
    log_activity(
        action='PRODUCT_CREATED',
        entity_type='PRODUCT',
        entity_id=product.sku,
        description=f"Created product '{product.name}' (SKU: {product.sku}) with {available_qty} units",
        user_id=current_user.id
    )

    return jsonify({'message': 'Product created successfully', 'product': product.to_dict()}), 201

@inventory_bp.route('/products/<int:product_id>', methods=['PUT'])
@token_required
@require_roles('manager')
def update_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}

    if 'name' in data:
        product.name = data['name'].strip()
    if 'category' in data:
        product.category = data['category'].strip()
    if 'description' in data:
        product.description = data['description'].strip()
    if 'min_stock_level' in data:
        product.min_stock_level = int(data['min_stock_level'])
    if 'unit_price' in data:
        product.unit_price = float(data['unit_price'])
    if 'bin_location_id' in data:
        product.bin_location_id = data['bin_location_id']
    if 'status' in data:
        product.status = data['status']

    # SKU update check
    if 'sku' in data and data['sku'].strip().upper() != product.sku:
        new_sku = data['sku'].strip().upper()
        if Product.query.filter(Product.sku == new_sku, Product.id != product.id).first():
            return jsonify({'error': f"SKU '{new_sku}' already taken"}), 409
        product.sku = new_sku

    # Barcode update check
    if 'barcode' in data and data['barcode'].strip() != product.barcode:
        new_bc = data['barcode'].strip()
        if Product.query.filter(Product.barcode == new_bc, Product.id != product.id).first():
            return jsonify({'error': f"Barcode '{new_bc}' already taken"}), 409
        product.barcode = new_bc

    db.session.commit()
    log_activity(
        action='PRODUCT_UPDATED',
        entity_type='PRODUCT',
        entity_id=product.sku,
        description=f"Updated product '{product.name}' details",
        user_id=current_user.id
    )
    return jsonify({'message': 'Product updated successfully', 'product': product.to_dict()}), 200

@inventory_bp.route('/products/<int:product_id>', methods=['DELETE'])
@token_required
@require_roles('manager')
def delete_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    
    # Check if product is in any open orders
    if product.reserved_qty > 0:
        return jsonify({'error': 'Cannot delete product with reserved stock in active orders'}), 400

    sku = product.sku
    name = product.name
    db.session.delete(product)
    db.session.commit()

    log_activity(
        action='PRODUCT_DELETED',
        entity_type='PRODUCT',
        entity_id=sku,
        description=f"Product '{name}' (SKU: {sku}) was removed",
        user_id=current_user.id
    )
    return jsonify({'message': f"Product {sku} deleted successfully"}), 200

@inventory_bp.route('/products/<int:product_id>/adjust-stock', methods=['POST'])
@token_required
def adjust_stock(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    
    tx_type = data.get('transaction_type', 'ADJUST').upper() # IN, OUT, ADJUST, DAMAGE
    delta_qty = int(data.get('quantity', 0))
    notes = data.get('notes', 'Manual inventory adjustment')

    if delta_qty == 0:
        return jsonify({'error': 'Adjustment quantity cannot be 0'}), 400

    prev_qty = product.available_qty

    if tx_type in ('OUT', 'DAMAGE'):
        if delta_qty > 0:
            delta_qty = -delta_qty
        if product.available_qty + delta_qty < 0:
            return jsonify({'error': f"Cannot deduct {abs(delta_qty)}: available stock is only {product.available_qty}"}), 400
        product.available_qty += delta_qty
    elif tx_type == 'IN':
        delta_qty = abs(delta_qty)
        product.available_qty += delta_qty
    elif tx_type == 'ADJUST':
        # Direct set or relative adjustment
        if 'new_total' in data:
            new_total = int(data['new_total'])
            if new_total < 0:
                return jsonify({'error': 'Total cannot be negative'}), 400
            delta_qty = new_total - prev_qty
            product.available_qty = new_total
        else:
            if product.available_qty + delta_qty < 0:
                return jsonify({'error': 'Resulting stock cannot be negative'}), 400
            product.available_qty += delta_qty

    inv_tx = InventoryTransaction(
        product_id=product.id,
        transaction_type=tx_type,
        quantity=delta_qty,
        previous_quantity=prev_qty,
        new_quantity=product.available_qty,
        reference_type='MANUAL_ADJUSTMENT',
        notes=notes,
        user_id=current_user.id
    )
    db.session.add(inv_tx)
    db.session.commit()

    log_activity(
        action='INVENTORY_ADJUSTED',
        entity_type='PRODUCT',
        entity_id=product.sku,
        description=f"Adjusted stock for {product.name} ({tx_type} {delta_qty}). Now {product.available_qty}",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Stock adjusted successfully',
        'product': product.to_dict()
    }), 200

# Bin Locations
@inventory_bp.route('/bin-locations', methods=['GET'])
@token_required
def get_bin_locations(current_user):
    bins = BinLocation.query.order_by(BinLocation.code.asc()).all()
    return jsonify({
        'total': len(bins),
        'bin_locations': [b.to_dict() for b in bins]
    }), 200

@inventory_bp.route('/bin-locations', methods=['POST'])
@token_required
@require_roles('manager')
def create_bin_location(current_user):
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper() # e.g. A-01-02
    zone = data.get('zone', '').strip()
    aisle = data.get('aisle', '').strip()
    rack = data.get('rack', '').strip()
    shelf = data.get('shelf', '').strip()
    max_capacity = int(data.get('max_capacity', 100))
    notes = data.get('notes', '')

    if not code or not zone or not aisle or not rack or not shelf:
        return jsonify({'error': 'Code, Zone, Aisle, Rack, and Shelf are required'}), 400

    if BinLocation.query.filter_by(code=code).first():
        return jsonify({'error': f"Bin location '{code}' already exists"}), 409

    bin_loc = BinLocation(
        code=code,
        zone=zone,
        aisle=aisle,
        rack=rack,
        shelf=shelf,
        max_capacity=max_capacity,
        notes=notes,
        is_active=True
    )
    db.session.add(bin_loc)
    db.session.commit()

    log_activity(
        action='BIN_CREATED',
        entity_type='BIN_LOCATION',
        entity_id=code,
        description=f"Created bin location {code} in {zone}",
        user_id=current_user.id
    )

    return jsonify({'message': 'Bin location created', 'bin_location': bin_loc.to_dict()}), 201

@inventory_bp.route('/lookup-barcode', methods=['POST'])
@token_required
def lookup_barcode(current_user):
    data = request.get_json() or {}
    barcode = data.get('barcode', '').strip()

    if not barcode:
        return jsonify({'error': 'Barcode number is required'}), 400

    product = Product.query.filter_by(barcode=barcode).first()
    if not product:
        return jsonify({'error': f"No product found matching barcode '{barcode}'"}), 404

    return jsonify({'product': product.to_dict()}), 200
