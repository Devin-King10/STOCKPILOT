from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User, Role
from app.middleware.auth import token_required, generate_token
from app.utils.logger import log_activity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username_or_email = data.get('username') or data.get('email')
    password = data.get('password')

    if not username_or_email or not password:
        return jsonify({'error': 'Username/email and password are required'}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials. Please verify username and password.'}), 401

    if not user.is_active:
        return jsonify({'error': 'This account has been deactivated. Contact an administrator.'}), 403

    token = generate_token(user.id)
    log_activity(
        action='USER_LOGIN',
        entity_type='USER',
        entity_id=user.id,
        description=f"User {user.username} ({user.role.name}) logged in successfully",
        user_id=user.id
    )

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role_name = data.get('role', 'picker').lower()

    if not username or not email or not password or not full_name:
        return jsonify({'error': 'All fields are required (username, email, password, full_name)'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' is already taken"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': f"Email '{email}' is already registered"}), 409

    role = Role.query.filter_by(name=role_name).first()
    if not role:
        role = Role.query.filter_by(name='picker').first()

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

    token = generate_token(new_user.id)
    log_activity(
        action='USER_REGISTERED',
        entity_type='USER',
        entity_id=new_user.id,
        description=f"New user registered: {new_user.username} with role {role.name}",
        user_id=new_user.id
    )

    return jsonify({
        'message': 'Registration successful',
        'token': token,
        'user': new_user.to_dict()
    }), 201

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json() or {}
    if 'full_name' in data and data['full_name'].strip():
        current_user.full_name = data['full_name'].strip()
    if 'email' in data and data['email'].strip():
        existing = User.query.filter(User.email == data['email'].strip(), User.id != current_user.id).first()
        if existing:
            return jsonify({'error': 'Email is already in use by another account'}), 409
        current_user.email = data['email'].strip()

    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully',
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400

    if not current_user.check_password(old_password):
        return jsonify({'error': 'Incorrect current password'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400

    current_user.set_password(new_password)
    db.session.commit()
    log_activity(
        action='PASSWORD_CHANGED',
        entity_type='USER',
        entity_id=current_user.id,
        description="Password updated successfully",
        user_id=current_user.id
    )

    return jsonify({'message': 'Password changed successfully'}), 200
