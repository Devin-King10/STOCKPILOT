from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User, Role
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
@token_required
def get_users(current_user):
    role_filter = request.args.get('role')
    query = User.query

    if role_filter:
        query = query.join(Role).filter(Role.name == role_filter)

    users = query.order_by(User.full_name.asc()).all()
    return jsonify({
        'total': len(users),
        'users': [u.to_dict() for u in users]
    }), 200

@users_bp.route('/roles', methods=['GET'])
@token_required
def get_roles(current_user):
    roles = Role.query.all()
    return jsonify({
        'roles': [r.to_dict() for r in roles]
    }), 200

@users_bp.route('/staff/<role_name>', methods=['GET'])
@token_required
def get_staff_by_role(current_user, role_name):
    users = User.query.join(Role).filter(Role.name == role_name, User.is_active == True).all()
    return jsonify({
        'users': [{'id': u.id, 'full_name': u.full_name, 'username': u.username} for u in users]
    }), 200

@users_bp.route('', methods=['POST'])
@token_required
@require_roles('manager')
def create_user(current_user):
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '')
    role_id = data.get('role_id')
    role_name = data.get('role')

    if not username or not email or not full_name or not password:
        return jsonify({'error': 'Username, email, full_name, and password are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' already exists"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': f"Email '{email}' already registered"}), 409

    role = None
    if role_id:
        role = Role.query.get(role_id)
    elif role_name:
        role = Role.query.filter_by(name=role_name).first()

    if not role:
        return jsonify({'error': 'Valid role must be specified'}), 400

    new_user = User(
        username=username,
        email=email,
        full_name=full_name,
        role_id=role.id,
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    log_activity(
        action='USER_CREATED',
        entity_type='USER',
        entity_id=new_user.id,
        description=f"User {new_user.username} created with role {role.name} by {current_user.full_name}",
        user_id=current_user.id
    )

    return jsonify({'message': 'User created successfully', 'user': new_user.to_dict()}), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
@require_roles('manager')
def update_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    if 'full_name' in data:
        user.full_name = data['full_name'].strip()
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'role_id' in data:
        role = Role.query.get(data['role_id'])
        if role:
            user.role_id = role.id
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    log_activity(
        action='USER_UPDATED',
        entity_type='USER',
        entity_id=user.id,
        description=f"User {user.username} updated by {current_user.full_name}",
        user_id=current_user.id
    )

    return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200
