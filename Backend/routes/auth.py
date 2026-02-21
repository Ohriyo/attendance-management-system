from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import secrets
import datetime
from database import get_db_connection

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password') 
    db = get_db_connection()
    cursor = db.cursor() # Get a cursor for Postgres execution
    
    # Updated: Changed '?' to '%s'
    cursor.execute("SELECT * FROM officers WHERE username = %s", (username,))
    officer = cursor.fetchone()

    if officer and check_password_hash(officer['password_hash'], password): 
        # Note: Postgres returns TRUE/FALSE for booleans
        if not officer['is_active']:
             return jsonify({'message': 'Account is suspended.'}), 403

        token = secrets.token_hex(16)
        now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Updated: Changed '?' to '%s'
        cursor.execute("UPDATE officers SET session_token = %s, last_login = %s WHERE id = %s", 
                       (token, now, officer['id']))
        db.commit()

        return jsonify({
            'message': 'Login successful', 
            'token': token,
            'user': {'username': officer['username'], 'role': officer['role']}
        }), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401

@auth_bp.route('/api/check_session', methods=['POST'])
def check_session_validity():
    data = request.get_json()
    token = data.get('token')
    username = data.get('username') 
    db = get_db_connection()
    cursor = db.cursor()
    
    # Updated: Changed '?' to '%s'
    cursor.execute("SELECT 1 FROM officers WHERE username = %s AND session_token = %s", (username, token))
    user = cursor.fetchone()
    
    return jsonify({'valid': True if user else False}), 200 if user else 401

@auth_bp.route('/api/update_password', methods=['POST'])
def change_own_password():
    data = request.get_json()
    username = data.get('username')
    current_pw = data.get('current_password')
    new_pw = data.get('new_password')
    token = data.get('token')

    db = get_db_connection()
    cursor = db.cursor()

    # 1. Verify session token first (matching your current auth style)
    cursor.execute("SELECT * FROM officers WHERE username = %s AND session_token = %s", (username, token))
    user = cursor.fetchone()

    if not user:
        return jsonify({'message': 'Unauthorized session'}), 401

    # 2. Verify current password before allowing change
    if not check_password_hash(user['password_hash'], current_pw):
        return jsonify({'message': 'Current password incorrect'}), 403

    # 3. Hash new password and update
    hashed_new = generate_password_hash(new_pw)
    cursor.execute("UPDATE officers SET password_hash = %s WHERE username = %s", (hashed_new, username))
    
    # 4. Log the action in your audit_logs table
    cursor.execute("INSERT INTO audit_logs (actor_username, action, details) VALUES (%s, %s, %s)", 
                   (username, 'UPDATE_PASSWORD', f'User {username} changed their own password.'))
    
    db.commit()
    cursor.close()
    return jsonify({'message': 'Password updated successfully'}), 200