from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
import psycopg2 # Updated: Using psycopg2 instead of sqlite3
from database import get_db_connection
from helpers import log_action

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/officers', methods=['GET'])
def get_all_officers():
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("SELECT id, username, role FROM officers ORDER BY username ASC")
    officers = cursor.fetchall()
    cursor.close()
    return jsonify([dict(row) for row in officers]), 200

@admin_bp.route('/api/admin/officers', methods=['POST'])
def create_officer():
    data = request.get_json()
    username, password, role = data.get('username'), data.get('password'), data.get('role', 'officer')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    hashed_pw = generate_password_hash(password)
    db = get_db_connection()
    cursor = db.cursor()
    try:
        # Updated: Changed '?' to '%s'
        cursor.execute("INSERT INTO officers (username, password_hash, role) VALUES (%s, %s, %s)", (username, hashed_pw, role))
        log_action('Superadmin', 'CREATE_OFFICER', f'Created officer: {username}')
        db.commit()
        return jsonify({'message': 'Officer created'}), 201
    except psycopg2.IntegrityError: # Updated: Postgres specific integrity error
        db.rollback()
        return jsonify({'message': 'Username exists'}), 409
    finally:
        cursor.close()

@admin_bp.route('/api/admin/settings', methods=['POST'])
def save_system_settings():
    data = request.get_json()
    db = get_db_connection()
    cursor = db.cursor()
    try:
        for key, value in data.items():
            # Updated: Postgres uses ON CONFLICT instead of INSERT OR REPLACE
            cursor.execute("""
                INSERT INTO settings (key, value) VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """, (key, str(value)))
        log_action('Admin', 'UPDATE_SETTINGS', 'Updated global configuration')        
        db.commit()
        return jsonify({'message': 'Settings updated.'}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

@admin_bp.route('/api/admin/logs', methods=['GET'])
def get_audit_logs():
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")
    logs = cursor.fetchall()
    cursor.close()
    return jsonify([dict(row) for row in logs]), 200

@admin_bp.route('/api/admin/backup', methods=['GET'])
def backup_database():
    db = get_db_connection()
    cursor = db.cursor()
    tables = ['students', 'attendance', 'events', 'officers', 'settings', 'sections']
    backup_data = {}
    for table in tables:
        # Note: Be careful with f-strings in queries; only use them for trusted table names
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        backup_data[table] = [dict(row) for row in rows]
    cursor.close()
    return jsonify(backup_data), 200

@admin_bp.route('/api/admin/maintenance/flush', methods=['POST'])
def flush_data():
    """Danger Zone: Deletes all attendance records."""
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'message': 'No data provided in request.'}), 400
    
    target = data.get('target') 
    if target != 'attendance':
        return jsonify({'message': 'Invalid flush target.'}), 400

    db = get_db_connection()
    cursor = db.cursor()
    actor = data.get('username', 'admin')
    
    try:
        # Wipes data and resets the SERIAL counter in one go
        cursor.execute("TRUNCATE TABLE attendance RESTART IDENTITY CASCADE")

        log_action(actor, 'FLUSH_DATA', 'Wiped all attendance records.')
        db.commit()
        return jsonify({'message': 'All attendance records have been wiped.'}), 200
        
    except Exception as e:
        db.rollback()
        return jsonify({'message': f"Server Error: {str(e)}"}), 500
    finally:
        cursor.close()
    
@admin_bp.route('/api/admin/sessions', methods=['GET'])
def get_active_sessions():
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("""
        SELECT username, role, last_login, session_token 
        FROM officers 
        WHERE session_token IS NOT NULL
        ORDER BY last_login DESC
    """)
    sessions = cursor.fetchall()
    cursor.close()
    return jsonify([dict(row) for row in sessions]), 200

@admin_bp.route('/api/admin/sessions/revoke', methods=['POST'])
def revoke_session():
    data = request.get_json()
    username = data.get('username')
    
    db = get_db_connection()
    cursor = db.cursor()
    try:
        # Updated: Changed '?' to '%s'
        cursor.execute("UPDATE officers SET session_token = NULL WHERE username = %s", (username,))
        db.commit()
        return jsonify({'message': f'Session revoked for {username}.'}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
# Add this to your admin.py
@admin_bp.route('/api/admin/officers/<username>', methods=['PUT'])
def update_officer(username):
    data = request.get_json()
    role = data.get('role')
    is_active = data.get('is_active')
    password = data.get('password')

    db = get_db_connection()
    cursor = db.cursor()

    try:
        if password: # If a new password was provided in the edit modal
            from werkzeug.security import generate_password_hash
            hashed_pw = generate_password_hash(password)
            cursor.execute("UPDATE officers SET role=%s, is_active=%s, password_hash=%s WHERE username=%s", 
                           (role, is_active, hashed_pw, username))
        else:
            cursor.execute("UPDATE officers SET role=%s, is_active=%s WHERE username=%s", 
                           (role, is_active, username))
        
        db.commit()
        return jsonify({"message": "Officer updated successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()