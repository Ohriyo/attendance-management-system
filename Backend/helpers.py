import os
import psycopg2
from cryptography.fernet import Fernet
from database import get_db_connection

# --- CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) 
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)              
KEY_PATH = os.path.join(PROJECT_ROOT, 'secret.key')

cipher = None

try:
    with open(KEY_PATH, "rb") as key_file:
        key = key_file.read()
        cipher = Fernet(key)
except FileNotFoundError:
    print(f"SECURITY WARNING: secret.key not found at {KEY_PATH}. Encryption disabled.")

# --- ENCRYPTION TOOLS ---
def encrypt_data(data):
    if not data or cipher is None: return data
    try:
        return cipher.encrypt(data.encode()).decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        return data

def decrypt_data(data):
    if not data or cipher is None: return data
    try:
        return cipher.decrypt(data.encode()).decode()
    except Exception:
        return data

# --- POSTGRESQL COMPATIBLE TOOLS ---

def log_action(actor, action, details):
    """Writes system events to the audit_logs table using Postgres syntax."""
    db = get_db_connection()
    cursor = db.cursor() # Required for PostgreSQL
    try:
        # Changed '?' to '%s' for PostgreSQL compatibility
        cursor.execute(
            "INSERT INTO audit_logs (actor_username, action, details) VALUES (%s, %s, %s)", 
            (actor, action, details)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to write audit log: {e}")
    finally:
        cursor.close()

def is_session_valid(username, client_token):
    """Verifies session tokens using Postgres %s placeholders."""
    if not username or not client_token:
        return False
        
    db = get_db_connection() 
    cursor = db.cursor() # Required for PostgreSQL
    try:
        # Changed '?' to '%s'
        cursor.execute(
            "SELECT session_token FROM officers WHERE username = %s", 
            (username,)
        )
        user = cursor.fetchone()

        # user[0] assumes the token is the first column in your SELECT
        if user and user[0] and user[0] == client_token:
            return True
    except Exception as e:
        print(f"Session check error: {e}")
    finally:
        cursor.close()
        
    return False