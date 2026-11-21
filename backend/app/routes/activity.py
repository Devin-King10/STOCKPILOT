from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from app.models.activity import ActivityLog, ErrorRecord
from app.middleware.auth import token_required, require_roles
from app.utils.logger import log_activity

activity_bp = Blueprint('activity', __name__)

@activity_bp.route('/logs', methods=['GET'])
@token_required
def get_logs(current_user):
    entity_type = request.args.get('entity_type')
    action = request.args.get('action')
    search = request.args.get('search')
    limit = int(request.args.get('limit', 100))

    query = ActivityLog.query

    if entity_type and entity_type != 'ALL':
        query = query.filter(ActivityLog.entity_type == entity_type)

    if action and action != 'ALL':
        query = query.filter(ActivityLog.action == action)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (ActivityLog.description.ilike(s)) |
            (ActivityLog.action.ilike(s)) |
            (ActivityLog.entity_id.ilike(s))
        )

    logs = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    return jsonify({
        'total': len(logs),
        'logs': [l.to_dict() for l in logs]
    }), 200

@activity_bp.route('/errors', methods=['GET'])
@token_required
def get_errors(current_user):
    status_filter = request.args.get('status')
    error_type = request.args.get('error_type')

    query = ErrorRecord.query

    if status_filter and status_filter != 'ALL':
        query = query.filter(ErrorRecord.status == status_filter)

    if error_type and error_type != 'ALL':
        query = query.filter(ErrorRecord.error_type == error_type)

    errors = query.order_by(ErrorRecord.reported_at.desc()).all()
    return jsonify({
        'total': len(errors),
        'errors': [e.to_dict() for e in errors]
    }), 200

@activity_bp.route('/errors/<int:error_id>/resolve', methods=['POST'])
@token_required
def resolve_error(current_user, error_id):
    error = ErrorRecord.query.get_or_404(error_id)
    data = request.get_json() or {}
    resolution_notes = data.get('resolution_notes', '').strip()

    if not resolution_notes:
        return jsonify({'error': 'Resolution notes are required to close an incident'}), 400

    error.status = 'RESOLVED'
    error.resolution_notes = resolution_notes
    error.resolved_at = datetime.utcnow()

    db.session.commit()

    log_activity(
        action='ERROR_RESOLVED',
        entity_type='ERROR',
        entity_id=error.id,
        description=f"Error #{error.id} ({error.error_type}) resolved: {resolution_notes}",
        user_id=current_user.id
    )

    return jsonify({
        'message': 'Error incident marked as resolved',
        'error': error.to_dict()
    }), 200
