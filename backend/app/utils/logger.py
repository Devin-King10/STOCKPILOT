from flask import request
from app import db
from app.models.activity import ActivityLog, ErrorRecord

def log_activity(action, entity_type, entity_id=None, description='', user_id=None):
    try:
        ip = None
        try:
            ip = request.remote_addr
        except RuntimeError:
            pass

        log_entry = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            description=description,
            ip_address=ip
        )
        db.session.add(log_entry)
        db.session.commit()
        return log_entry
    except Exception as e:
        db.session.rollback()
        print(f"[ActivityLog Error] Failed to log activity: {e}")
        return None

def log_error(error_type, description, order_id=None, product_id=None, user_id=None, severity='MEDIUM'):
    try:
        error_entry = ErrorRecord(
            error_type=error_type,
            order_id=order_id,
            product_id=product_id,
            user_id=user_id,
            description=description,
            severity=severity,
            status='UNRESOLVED'
        )
        db.session.add(error_entry)
        
        # Also record in activity log
        log_activity(
            action=f'{error_type}_LOGGED',
            entity_type='ERROR',
            entity_id=order_id or product_id,
            description=f'[{severity}] {description}',
            user_id=user_id
        )
        
        db.session.commit()
        return error_entry
    except Exception as e:
        db.session.rollback()
        print(f"[ErrorRecord Error] Failed to log error: {e}")
        return None
