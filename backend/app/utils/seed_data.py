from datetime import datetime, timedelta
import random
from app import db
from app.models.user import User, Role
from app.models.bin_location import BinLocation
from app.models.product import Product, InventoryTransaction
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.picking import PickingTask, PickingItem
from app.models.packing import PackingRecord, PackingItem
from app.models.dispatch import DispatchRecord
from app.models.activity import ActivityLog, ErrorRecord

def seed_database():
    """Seeds the database with comprehensive initial warehouse data."""
    print("Starting database seeding...")

    # Check if already seeded
    if User.query.filter_by(username='manager').first():
        print("Database already contains seed data. Skipping.")
        return

    # 1. Seed Roles
    roles_data = [
        {
            'name': 'manager',
            'display_name': 'Warehouse Manager',
            'description': 'Full operational access, analytics, user management, and inventory control',
            'permissions': 'dashboard:view,orders:manage,inventory:manage,picking:manage,packing:manage,dispatch:manage,analytics:view,users:manage,reports:export'
        },
        {
            'name': 'picker',
            'display_name': 'Warehouse Picker',
            'description': 'Receives pick tasks, validates barcodes, and records picked inventory',
            'permissions': 'picking:view,picking:execute,inventory:view'
        },
        {
            'name': 'packer',
            'display_name': 'Packing Staff',
            'description': 'Conducts packing checklists, package measurements, and confirms packaging',
            'permissions': 'packing:view,packing:execute,inventory:view'
        },
        {
            'name': 'dispatch',
            'display_name': 'Dispatch Executive',
            'description': 'Manages carrier assignment, tracking labels, and final dispatch confirmation',
            'permissions': 'dispatch:view,dispatch:execute,orders:view'
        }
    ]

    role_objs = {}
    for r_data in roles_data:
        role = Role(**r_data)
        db.session.add(role)
        role_objs[r_data['name']] = role
    db.session.commit()

    # 2. Seed Users
    users_data = [
        {
            'username': 'manager',
            'email': 'manager@stockpilot.io',
            'full_name': 'Marcus Vance',
            'role_id': role_objs['manager'].id,
            'password': 'Manager@123'
        },
        {
            'username': 'picker',
            'email': 'picker@stockpilot.io',
            'full_name': 'Paul Rivera',
            'role_id': role_objs['picker'].id,
            'password': 'Picker@123'
        },
        {
            'username': 'picker2',
            'email': 'picker2@stockpilot.io',
            'full_name': 'Elena Rostov',
            'role_id': role_objs['picker'].id,
            'password': 'Picker@123'
        },
        {
            'username': 'packer',
            'email': 'packer@stockpilot.io',
            'full_name': 'Sarah Jenkins',
            'role_id': role_objs['packer'].id,
            'password': 'Packer@123'
        },
        {
            'username': 'packer2',
            'email': 'packer2@stockpilot.io',
            'full_name': 'Thomas Miller',
            'role_id': role_objs['packer'].id,
            'password': 'Packer@123'
        },
        {
            'username': 'dispatch',
            'email': 'dispatch@stockpilot.io',
            'full_name': 'David Chen',
            'role_id': role_objs['dispatch'].id,
            'password': 'Dispatch@123'
        }
    ]

    user_objs = {}
    for u_data in users_data:
        pwd = u_data.pop('password')
        user = User(**u_data)
        user.set_password(pwd)
        db.session.add(user)
        user_objs[u_data['username']] = user
    db.session.commit()

    # 3. Seed Bin Locations
    bins_data = [
        {'code': 'A-01-01', 'zone': 'Zone A - High Velocity', 'aisle': '01', 'rack': '01', 'shelf': '01', 'max_capacity': 120},
        {'code': 'A-01-02', 'zone': 'Zone A - High Velocity', 'aisle': '01', 'rack': '01', 'shelf': '02', 'max_capacity': 120},
        {'code': 'A-01-03', 'zone': 'Zone A - High Velocity', 'aisle': '01', 'rack': '01', 'shelf': '03', 'max_capacity': 100},
        {'code': 'A-02-01', 'zone': 'Zone A - High Velocity', 'aisle': '02', 'rack': '01', 'shelf': '01', 'max_capacity': 150},
        {'code': 'A-02-02', 'zone': 'Zone A - High Velocity', 'aisle': '02', 'rack': '01', 'shelf': '02', 'max_capacity': 150},
        {'code': 'B-01-01', 'zone': 'Zone B - Apparel & Gear', 'aisle': '01', 'rack': '01', 'shelf': '01', 'max_capacity': 200},
        {'code': 'B-01-02', 'zone': 'Zone B - Apparel & Gear', 'aisle': '01', 'rack': '01', 'shelf': '02', 'max_capacity': 200},
        {'code': 'B-02-01', 'zone': 'Zone B - Apparel & Gear', 'aisle': '02', 'rack': '01', 'shelf': '01', 'max_capacity': 200},
        {'code': 'C-01-01', 'zone': 'Zone C - Tools & Hardware', 'aisle': '01', 'rack': '01', 'shelf': '01', 'max_capacity': 80},
        {'code': 'C-02-01', 'zone': 'Zone C - Tools & Hardware', 'aisle': '02', 'rack': '01', 'shelf': '01', 'max_capacity': 80},
        {'code': 'C-03-01', 'zone': 'Zone C - Tools & Hardware', 'aisle': '03', 'rack': '01', 'shelf': '01', 'max_capacity': 80},
        {'code': 'C-03-04', 'zone': 'Zone C - Tools & Hardware', 'aisle': '03', 'rack': '01', 'shelf': '04', 'max_capacity': 50},
        {'code': 'D-01-01', 'zone': 'Zone D - Fragile / Glass', 'aisle': '01', 'rack': '01', 'shelf': '01', 'max_capacity': 60},
        {'code': 'D-01-02', 'zone': 'Zone D - Fragile / Glass', 'aisle': '01', 'rack': '01', 'shelf': '02', 'max_capacity': 60}
    ]

    bin_objs = {}
    for b_data in bins_data:
        bin_loc = BinLocation(**b_data)
        db.session.add(bin_loc)
        bin_objs[b_data['code']] = bin_loc
    db.session.commit()

    # 4. Seed Products
    products_data = [
        {
            'name': 'Apex Pro Wireless Gaming Headset',
            'sku': 'EL-HD-001',
            'barcode': '890123400101',
            'category': 'Electronics',
            'description': 'Low-latency lossless wireless audio with noise-canceling mic.',
            'available_qty': 85,
            'reserved_qty': 15,
            'min_stock_level': 20,
            'unit_price': 149.99,
            'bin_location_id': bin_objs['A-01-01'].id
        },
        {
            'name': 'Ergonomic Mechanical Keyboard RGB',
            'sku': 'EL-KB-002',
            'barcode': '890123400202',
            'category': 'Electronics',
            'description': 'Hot-swappable tactile switches with aircraft-grade aluminum frame.',
            'available_qty': 62,
            'reserved_qty': 8,
            'min_stock_level': 15,
            'unit_price': 119.50,
            'bin_location_id': bin_objs['A-01-02'].id
        },
        {
            'name': 'Ultra-Fast 65W GaN Charger 3-Port',
            'sku': 'EL-CH-003',
            'barcode': '890123400303',
            'category': 'Electronics',
            'description': 'Compact dual USB-C plus USB-A high-speed fast charging brick.',
            'available_qty': 140,
            'reserved_qty': 20,
            'min_stock_level': 30,
            'unit_price': 39.99,
            'bin_location_id': bin_objs['A-01-03'].id
        },
        {
            'name': '4K HDR Webcam with Stereo Dual Mics',
            'sku': 'EL-WC-004',
            'barcode': '890123400404',
            'category': 'Electronics',
            'description': 'Ultra HD 60fps streaming camera with autofocus and privacy shutter.',
            'available_qty': 45,
            'reserved_qty': 5,
            'min_stock_level': 10,
            'unit_price': 89.99,
            'bin_location_id': bin_objs['A-02-01'].id
        },
        {
            'name': 'Rugged Waterproof Tactical Backpack 35L',
            'sku': 'AP-BP-101',
            'barcode': '890123410105',
            'category': 'Apparel & Gear',
            'description': 'MOLLE-compatible ballistic nylon backpack with padded laptop sleeve.',
            'available_qty': 50,
            'reserved_qty': 10,
            'min_stock_level': 15,
            'unit_price': 79.00,
            'bin_location_id': bin_objs['B-01-01'].id
        },
        {
            'name': 'Thermal Insulated Work Jacket (Large)',
            'sku': 'AP-JK-102',
            'barcode': '890123410206',
            'category': 'Apparel & Gear',
            'description': 'Heavy-duty duck canvas winter jacket with sherpa fleece lining.',
            'available_qty': 30,
            'reserved_qty': 6,
            'min_stock_level': 12,
            'unit_price': 129.00,
            'bin_location_id': bin_objs['B-01-02'].id
        },
        {
            'name': 'Precision Screwdriver Toolkit 64-in-1',
            'sku': 'TL-SD-201',
            'barcode': '890123420107',
            'category': 'Tools',
            'description': 'Magnetic electronics repair kit with flexible extension shaft.',
            'available_qty': 95,
            'reserved_qty': 12,
            'min_stock_level': 25,
            'unit_price': 29.99,
            'bin_location_id': bin_objs['C-01-01'].id
        },
        {
            'name': 'Cordless Brushless Drill 20V Max',
            'sku': 'TL-DR-202',
            'barcode': '890123420208',
            'category': 'Tools',
            'description': 'High-torque drill with 2-speed gearbox and two 2.0Ah lithium batteries.',
            'available_qty': 28,
            'reserved_qty': 4,
            'min_stock_level': 10,
            'unit_price': 159.95,
            'bin_location_id': bin_objs['C-02-01'].id
        },
        {
            'name': 'Laser Distance Measurer 50m / 165ft',
            'sku': 'TL-LM-203',
            'barcode': '890123420309',
            'category': 'Tools',
            'description': 'Digital backlit measuring meter with area, volume, and Pythagorean modes.',
            'available_qty': 40,
            'reserved_qty': 2,
            'min_stock_level': 10,
            'unit_price': 45.00,
            'bin_location_id': bin_objs['C-03-01'].id
        },
        {
            'name': 'Ceramic Studio Artisan Mug Set (4-Pack)',
            'sku': 'HM-MG-301',
            'barcode': '890123430110',
            'category': 'Fragile Goods',
            'description': 'Handcrafted stoneware ceramic mugs with reactive glazed finish.',
            'available_qty': 35,
            'reserved_qty': 5,
            'min_stock_level': 15,
            'unit_price': 42.00,
            'bin_location_id': bin_objs['D-01-01'].id
        },
        {
            'name': 'High-Torque Heavy Impact Wrench 1/2"',
            'sku': 'TL-IW-204',
            'barcode': '890123420411',
            'category': 'Tools',
            'description': 'Pneumatic grade high-performance cordless impact driver for automotive.',
            'available_qty': 4, # Low stock alert! (below min_stock_level 12)
            'reserved_qty': 2,
            'min_stock_level': 12,
            'unit_price': 189.00,
            'bin_location_id': bin_objs['C-03-04'].id
        }
    ]

    prod_objs = {}
    for p_data in products_data:
        prod = Product(**p_data)
        db.session.add(prod)
        prod_objs[p_data['sku']] = prod
    db.session.commit()

    # Initial inventory transactions
    for prod in prod_objs.values():
        inv_tx = InventoryTransaction(
            product_id=prod.id,
            transaction_type='IN',
            quantity=prod.available_qty + prod.reserved_qty,
            previous_quantity=0,
            new_quantity=prod.available_qty + prod.reserved_qty,
            reference_type='INITIAL_STOCK',
            notes='Initial warehouse stock intake',
            user_id=user_objs['manager'].id,
            timestamp=datetime.utcnow() - timedelta(days=15)
        )
        db.session.add(inv_tx)
    db.session.commit()

    # 5. Seed Realistic Orders Across Different Pipeline Statuses
    now = datetime.utcnow()

    orders_seed = [
        # 1. Order Dispatched (Completed lifecycle)
        {
            'order_number': 'ORD-2026-1001',
            'customer_name': 'Alpha Corp Logistics',
            'customer_email': 'procurement@alphacorp.com',
            'customer_phone': '+1 (555) 234-5678',
            'shipping_address': '742 Evergreen Terrace, Sector 4',
            'city': 'Seattle',
            'postal_code': '98101',
            'priority': 'HIGH',
            'status': 'Dispatched',
            'picker': user_objs['picker'],
            'packer': user_objs['packer'],
            'dispatch_exec': user_objs['dispatch'],
            'items': [
                (prod_objs['EL-HD-001'], 2),
                (prod_objs['EL-KB-002'], 1)
            ],
            'created_hours_ago': 28,
            'picking_started_hours_ago': 26,
            'picked_hours_ago': 25,
            'packing_started_hours_ago': 24,
            'packed_hours_ago': 23,
            'dispatched_hours_ago': 20,
            'courier': 'FedEx Express',
            'tracking': 'FX-982348123US'
        },
        # 2. Order Delivered
        {
            'order_number': 'ORD-2026-1002',
            'customer_name': 'Nexus Industrial Labs',
            'customer_email': 'support@nexuslabs.org',
            'customer_phone': '+1 (555) 876-5432',
            'shipping_address': '120 Innovation Way, Suite 300',
            'city': 'San Jose',
            'postal_code': '95110',
            'priority': 'URGENT',
            'status': 'Delivered',
            'picker': user_objs['picker2'],
            'packer': user_objs['packer2'],
            'dispatch_exec': user_objs['dispatch'],
            'items': [
                (prod_objs['TL-DR-202'], 1),
                (prod_objs['TL-SD-201'], 3)
            ],
            'created_hours_ago': 48,
            'picking_started_hours_ago': 46,
            'picked_hours_ago': 45,
            'packing_started_hours_ago': 44,
            'packed_hours_ago': 43,
            'dispatched_hours_ago': 40,
            'delivered_hours_ago': 12,
            'courier': 'DHL Express',
            'tracking': 'DHL-5544991122'
        },
        # 3. Ready for Dispatch
        {
            'order_number': 'ORD-2026-1003',
            'customer_name': 'Horizon Retailers Ltd',
            'customer_email': 'orders@horizonretail.com',
            'customer_phone': '+1 (555) 443-2211',
            'shipping_address': '884 Broadway Ave',
            'city': 'New York',
            'postal_code': '10003',
            'priority': 'HIGH',
            'status': 'Ready for Dispatch',
            'picker': user_objs['picker'],
            'packer': user_objs['packer'],
            'dispatch_exec': None,
            'items': [
                (prod_objs['EL-CH-003'], 5),
                (prod_objs['EL-WC-004'], 2)
            ],
            'created_hours_ago': 14,
            'picking_started_hours_ago': 12,
            'picked_hours_ago': 10,
            'packing_started_hours_ago': 8,
            'packed_hours_ago': 4,
            'dispatched_hours_ago': None
        },
        # 4. Ready for Dispatch (another one)
        {
            'order_number': 'ORD-2026-1004',
            'customer_name': 'Apex Outfitters',
            'customer_email': 'inventory@apexgear.io',
            'customer_phone': '+1 (555) 991-3344',
            'shipping_address': '452 Pine Hill Road',
            'city': 'Denver',
            'postal_code': '80202',
            'priority': 'NORMAL',
            'status': 'Ready for Dispatch',
            'picker': user_objs['picker2'],
            'packer': user_objs['packer'],
            'dispatch_exec': None,
            'items': [
                (prod_objs['AP-BP-101'], 2),
                (prod_objs['AP-JK-102'], 1)
            ],
            'created_hours_ago': 10,
            'picking_started_hours_ago': 8,
            'picked_hours_ago': 6,
            'packing_started_hours_ago': 5,
            'packed_hours_ago': 2,
            'dispatched_hours_ago': None
        },
        # 5. Packing In Progress
        {
            'order_number': 'ORD-2026-1005',
            'customer_name': 'Quantum Media Works',
            'customer_email': 'studio@quantummedia.co',
            'customer_phone': '+1 (555) 332-9988',
            'shipping_address': '55 Sunset Boulevard, Studio 4B',
            'city': 'Los Angeles',
            'postal_code': '90028',
            'priority': 'HIGH',
            'status': 'Packing In Progress',
            'picker': user_objs['picker'],
            'packer': user_objs['packer'],
            'dispatch_exec': None,
            'items': [
                (prod_objs['EL-HD-001'], 1),
                (prod_objs['EL-WC-004'], 1),
                (prod_objs['EL-CH-003'], 2)
            ],
            'created_hours_ago': 6,
            'picking_started_hours_ago': 4,
            'picked_hours_ago': 3,
            'packing_started_hours_ago': 1,
            'packed_hours_ago': None,
            'dispatched_hours_ago': None
        },
        # 6. Packing Pending (Picking completed, waiting for packer)
        {
            'order_number': 'ORD-2026-1006',
            'customer_name': 'Beacon Architecture Studio',
            'customer_email': 'studio@beaconarch.org',
            'customer_phone': '+1 (555) 667-8899',
            'shipping_address': '300 Harbor Plaza, Floor 12',
            'city': 'Boston',
            'postal_code': '02110',
            'priority': 'NORMAL',
            'status': 'Packing Pending',
            'picker': user_objs['picker2'],
            'packer': None,
            'dispatch_exec': None,
            'items': [
                (prod_objs['TL-LM-203'], 2),
                (prod_objs['TL-SD-201'], 2)
            ],
            'created_hours_ago': 5,
            'picking_started_hours_ago': 3,
            'picked_hours_ago': 1,
            'packing_started_hours_ago': None,
            'packed_hours_ago': None,
            'dispatched_hours_ago': None
        },
        # 7. Picking In Progress
        {
            'order_number': 'ORD-2026-1007',
            'customer_name': 'Summit Field Solutions',
            'customer_email': 'procure@summitfield.net',
            'customer_phone': '+1 (555) 123-9876',
            'shipping_address': '909 Mountain View Trail',
            'city': 'Boulder',
            'postal_code': '80302',
            'priority': 'HIGH',
            'status': 'Picking In Progress',
            'picker': user_objs['picker'],
            'packer': None,
            'dispatch_exec': None,
            'items': [
                (prod_objs['TL-DR-202'], 1),
                (prod_objs['AP-BP-101'], 1),
                (prod_objs['TL-SD-201'], 1)
            ],
            'created_hours_ago': 3,
            'picking_started_hours_ago': 1,
            'picked_hours_ago': None,
            'packing_started_hours_ago': None,
            'packed_hours_ago': None,
            'dispatched_hours_ago': None
        },
        # 8. Picking Pending (Assigned to Paul Rivera)
        {
            'order_number': 'ORD-2026-1008',
            'customer_name': 'Sierra Ceramic Crafts',
            'customer_email': 'hello@sierracrafts.com',
            'customer_phone': '+1 (555) 432-1098',
            'shipping_address': '72 Artisan Alley',
            'city': 'Portland',
            'postal_code': '97201',
            'priority': 'NORMAL',
            'status': 'Picking Pending',
            'picker': user_objs['picker'],
            'packer': None,
            'dispatch_exec': None,
            'items': [
                (prod_objs['HM-MG-301'], 3)
            ],
            'created_hours_ago': 2,
            'picking_started_hours_ago': None,
            'picked_hours_ago': None,
            'packing_started_hours_ago': None,
            'packed_hours_ago': None,
            'dispatched_hours_ago': None
        },
        # 9. Order Created (New, Unassigned)
        {
            'order_number': 'ORD-2026-1009',
            'customer_name': 'Cascade Enterprise Tech',
            'customer_email': 'it@cascadecorp.com',
            'customer_phone': '+1 (555) 887-2233',
            'shipping_address': '101 Industrial Parkway',
            'city': 'Austin',
            'postal_code': '78701',
            'priority': 'URGENT',
            'status': 'Order Created',
            'picker': None,
            'packer': None,
            'dispatch_exec': None,
            'items': [
                (prod_objs['EL-KB-002'], 2),
                (prod_objs['EL-HD-001'], 1)
            ],
            'created_hours_ago': 1,
            'picking_started_hours_ago': None,
            'picked_hours_ago': None,
            'packing_started_hours_ago': None,
            'packed_hours_ago': None,
            'dispatched_hours_ago': None
        },
        # 10. Delayed Order (Demonstrates delayed order KPI and notification)
        {
            'order_number': 'ORD-2026-1010',
            'customer_name': 'Vanguard Engineering Co',
            'customer_email': 'ops@vanguardeng.com',
            'customer_phone': '+1 (555) 776-5544',
            'shipping_address': '400 North Industrial Blvd',
            'city': 'Chicago',
            'postal_code': '60601',
            'priority': 'URGENT',
            'status': 'Picking Pending',
            'picker': user_objs['picker'],
            'packer': None,
            'dispatch_exec': None,
            'items': [
                (prod_objs['TL-IW-204'], 1), # Low stock item
                (prod_objs['TL-DR-202'], 1)
            ],
            'created_hours_ago': 76, # Over 3 days old!
            'picking_started_hours_ago': None,
            'picked_hours_ago': None,
            'packing_started_hours_ago': None,
            'packed_hours_ago': None,
            'dispatched_hours_ago': None
        }
    ]

    for o_info in orders_seed:
        c_time = now - timedelta(hours=o_info['created_hours_ago'])
        total_items = sum(qty for _, qty in o_info['items'])
        total_amount = sum(prod.unit_price * qty for prod, qty in o_info['items'])

        order = Order(
            order_number=o_info['order_number'],
            customer_name=o_info['customer_name'],
            customer_email=o_info['customer_email'],
            customer_phone=o_info['customer_phone'],
            shipping_address=o_info['shipping_address'],
            city=o_info['city'],
            postal_code=o_info['postal_code'],
            priority=o_info['priority'],
            status=o_info['status'],
            assigned_picker_id=o_info['picker'].id if o_info['picker'] else None,
            total_items=total_items,
            total_amount=round(total_amount, 2),
            created_at=c_time,
            updated_at=c_time,
            picking_started_at=now - timedelta(hours=o_info['picking_started_hours_ago']) if o_info['picking_started_hours_ago'] else None,
            picked_at=now - timedelta(hours=o_info['picked_hours_ago']) if o_info['picked_hours_ago'] else None,
            packing_started_at=now - timedelta(hours=o_info['packing_started_hours_ago']) if o_info['packing_started_hours_ago'] else None,
            packed_at=now - timedelta(hours=o_info['packed_hours_ago']) if o_info['packed_hours_ago'] else None,
            dispatched_at=now - timedelta(hours=o_info['dispatched_hours_ago']) if o_info['dispatched_hours_ago'] else None,
            delivered_at=now - timedelta(hours=o_info.get('delivered_hours_ago')) if o_info.get('delivered_hours_ago') else None
        )
        db.session.add(order)
        db.session.flush()

        # Status History
        sh1 = OrderStatusHistory(
            order_id=order.id,
            old_status=None,
            new_status='Order Created',
            changed_by_user_id=user_objs['manager'].id,
            notes='Order imported into StockPilot',
            timestamp=c_time
        )
        db.session.add(sh1)

        # Order Items
        order_item_objs = []
        for prod, qty in o_info['items']:
            is_picked = o_info['picked_hours_ago'] is not None
            is_packed = o_info['packed_hours_ago'] is not None
            
            oi = OrderItem(
                order_id=order.id,
                product_id=prod.id,
                quantity=qty,
                unit_price=prod.unit_price,
                picked_qty=qty if is_picked else (1 if o_info['status'] == 'Picking In Progress' and qty > 1 else 0),
                packed_qty=qty if is_packed else 0,
                status='PACKED' if is_packed else ('PICKED' if is_picked else 'PENDING')
            )
            db.session.add(oi)
            order_item_objs.append((oi, prod, qty))
        db.session.flush()

        # Picking Task
        if o_info['picker'] or o_info['status'] in ('Picking Pending', 'Picking In Progress', 'Picking Completed', 'Packing Pending', 'Packing In Progress', 'Packing Completed', 'Ready for Dispatch', 'Dispatched', 'Delivered'):
            pick_status = 'COMPLETED' if o_info['picked_hours_ago'] else ('IN_PROGRESS' if o_info['picking_started_hours_ago'] else 'PENDING')
            pt = PickingTask(
                task_number=f"PICK-{order.order_number}",
                order_id=order.id,
                picker_id=o_info['picker'].id if o_info['picker'] else user_objs['picker'].id,
                status=pick_status,
                total_items=total_items,
                picked_items=total_items if pick_status == 'COMPLETED' else (1 if pick_status == 'IN_PROGRESS' else 0),
                started_at=order.picking_started_at,
                completed_at=order.picked_at,
                created_at=c_time
            )
            db.session.add(pt)
            db.session.flush()

            for oi, prod, qty in order_item_objs:
                item_picked = pick_status == 'COMPLETED' or (pick_status == 'IN_PROGRESS' and oi.picked_qty > 0)
                pi = PickingItem(
                    picking_task_id=pt.id,
                    order_item_id=oi.id,
                    product_id=prod.id,
                    bin_location_id=prod.bin_location_id,
                    required_qty=qty,
                    picked_qty=qty if pick_status == 'COMPLETED' else oi.picked_qty,
                    barcode_scanned=prod.barcode if item_picked else None,
                    status='PICKED' if item_picked else 'PENDING',
                    picked_at=order.picked_at if item_picked else None
                )
                db.session.add(pi)

        # Packing Record
        if o_info['status'] in ('Packing In Progress', 'Packing Completed', 'Ready for Dispatch', 'Dispatched', 'Delivered'):
            pack_status = 'COMPLETED' if o_info['packed_hours_ago'] else 'IN_PROGRESS'
            pr = PackingRecord(
                order_id=order.id,
                packer_id=o_info['packer'].id if o_info['packer'] else user_objs['packer'].id,
                status=pack_status,
                package_dimensions='40x30x20 cm',
                package_weight=3.2,
                package_type='Standard Box',
                started_at=order.packing_started_at,
                completed_at=order.packed_at,
                created_at=order.picked_at or c_time
            )
            pr.checklist = {
                'qty_verified': True,
                'condition_verified': True,
                'order_items_confirmed': True,
                'packaging_completed': pack_status == 'COMPLETED',
                'shipping_label_prepared': pack_status == 'COMPLETED'
            }
            db.session.add(pr)
            db.session.flush()

            for oi, prod, qty in order_item_objs:
                pki = PackingItem(
                    packing_record_id=pr.id,
                    order_item_id=oi.id,
                    product_id=prod.id,
                    verified_qty=qty if pack_status == 'COMPLETED' else 0,
                    is_condition_verified=True,
                    status='VERIFIED' if pack_status == 'COMPLETED' else 'PENDING'
                )
                db.session.add(pki)

        # Dispatch Record
        if o_info.get('dispatched_hours_ago'):
            dr = DispatchRecord(
                order_id=order.id,
                dispatch_executive_id=o_info['dispatch_exec'].id if o_info['dispatch_exec'] else user_objs['dispatch'].id,
                courier_name=o_info.get('courier', 'FedEx Express'),
                tracking_number=o_info.get('tracking', f"TRK-{random.randint(100000000, 999999999)}"),
                shipment_type='Priority Express',
                shipping_cost=24.50,
                dispatch_date=order.dispatched_at,
                estimated_delivery_date=order.dispatched_at + timedelta(days=2),
                notes='Packed in reinforced corrugated box with tamper-evident seal.'
            )
            db.session.add(dr)

    db.session.commit()

    # 6. Seed Error Records
    err1 = ErrorRecord(
        error_type='PICKING_ERROR',
        order_id=1,
        product_id=prod_objs['EL-HD-001'].id,
        user_id=user_objs['picker'].id,
        description='Incorrect barcode 890123400199 scanned during item verification at bin A-01-01',
        severity='LOW',
        status='RESOLVED',
        resolution_notes='Picker rescanned matching product barcode 890123400101 and confirmed.',
        reported_at=now - timedelta(hours=26),
        resolved_at=now - timedelta(hours=25, minutes=50)
    )
    db.session.add(err1)

    err2 = ErrorRecord(
        error_type='PACKING_ERROR',
        order_id=5,
        product_id=prod_objs['EL-WC-004'].id,
        user_id=user_objs['packer'].id,
        description='Dented retail packaging detected during physical condition inspection',
        severity='MEDIUM',
        status='RESOLVED',
        resolution_notes='Defective box returned to QA. Replaced with pristine unit from bin A-02-01.',
        reported_at=now - timedelta(hours=1, minutes=30),
        resolved_at=now - timedelta(hours=1, minutes=10)
    )
    db.session.add(err2)

    err3 = ErrorRecord(
        error_type='INVENTORY_ERROR',
        order_id=10,
        product_id=prod_objs['TL-IW-204'].id,
        user_id=user_objs['picker'].id,
        description='Low physical stock warning at bin C-03-04 for High-Torque Heavy Impact Wrench',
        severity='HIGH',
        status='UNRESOLVED',
        reported_at=now - timedelta(hours=12)
    )
    db.session.add(err3)

    # 7. Seed Activity Logs
    activity_entries = [
        ('ORDER_CREATED', 'ORDER', 'ORD-2026-1009', 'New customer order ORD-2026-1009 registered by manager', user_objs['manager'].id, now - timedelta(hours=1)),
        ('PICKING_STARTED', 'PICKING', 'ORD-2026-1007', 'Paul Rivera began picking tasks for ORD-2026-1007', user_objs['picker'].id, now - timedelta(hours=1)),
        ('PACKING_STARTED', 'PACKING', 'ORD-2026-1005', 'Sarah Jenkins initiated packing checklist for ORD-2026-1005', user_objs['packer'].id, now - timedelta(hours=1, minutes=15)),
        ('PACKING_COMPLETED', 'PACKING', 'ORD-2026-1004', 'Packaging and label affixed for order ORD-2026-1004', user_objs['packer'].id, now - timedelta(hours=2)),
        ('DISPATCH_CONFIRMED', 'DISPATCH', 'ORD-2026-1001', 'Order ORD-2026-1001 dispatched via FedEx Express (FX-982348123US)', user_objs['dispatch'].id, now - timedelta(hours=20)),
        ('INVENTORY_UPDATED', 'PRODUCT', 'TL-IW-204', 'Stock reserved for customer order ORD-2026-1010', user_objs['manager'].id, now - timedelta(hours=76))
    ]

    for act, ent, ent_id, desc, uid, ts in activity_entries:
        log = ActivityLog(
            action=act,
            entity_type=ent,
            entity_id=ent_id,
            description=desc,
            user_id=uid,
            timestamp=ts
        )
        db.session.add(log)

    db.session.commit()
    print("Database seeding completed successfully!")
