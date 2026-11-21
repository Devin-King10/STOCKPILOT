import jwt
from functools import wraps
from datetime import datetime, timedelta
from flask import request, jsonify, current_app
from app.models.user import User

def generate_token(user_id):
    payload = {
        'sub': user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=current_app.config.get('JWT_EXPIRATION_HOURS', 24))
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')

        if auth_header:
            parts = auth_header.split(' ')
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]

        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401

        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=['HS256'])
            user_id = payload['sub']
            current_user = User.query.get(user_id)
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
            if not current_user.is_active:
                return jsonify({'error': 'User account has been deactivated'}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired. Please log in again'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

def require_roles(*allowed_roles):
    """
    Decorator to restrict endpoint access by role name.
    'manager' role inherently has supervisor access to all roles.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            user_role = current_user.role.name if current_user.role else None
            
            # Managers have universal access
            if user_role == 'manager':
                return f(current_user, *args, **kwargs)
                
            if user_role not in allowed_roles:
                return jsonify({
                    'error': f"Access forbidden: requires one of [{', '.join(allowed_roles)}] role, but you are '{user_role}'"
                }), 403

            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator
