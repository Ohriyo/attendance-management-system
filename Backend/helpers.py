import os
import psycopg2
from cryptography.fernet import Fernet
from database import get_db_connection

# --- CONFIGURATION (Production Ready) ---
# Retrieve the key securely from the environment
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

cipher = None
if ENCRYPTION_KEY:
    try:
        # Ensure the key is in bytes format
        cipher = Fernet(ENCRYPTION_KEY.encode('utf-8'))
    except Exception as e:
        print(f"CRITICAL: Invalid ENCRYPTION_KEY format. {e}")
else:
    print("SECURITY WARNING: ENCRYPTION_KEY environment variable is missing! Encryption disabled.")

# --- ENCRYPTION TOOLS --- 
def encrypt_data(data):
    if not data or cipher is None: return data
    try:
        return cipher.encrypt(data.encode('utf-8')).decode('utf-8')
    except Exception as e:
        print(f"Encryption error: {e}")
        return data

def decrypt_data(data):
    if not data or cipher is None: return data
    
    # If the data doesn't look like Fernet (doesn't start with gAAAA), return it as-is
    if not str(data).startswith('gAAAA'):
        return data

    try:
        return cipher.decrypt(data.encode('utf-8')).decode('utf-8')
    except Exception as e:
        # We print the error so it shows up in Render Logs, but return a fallback string
        print(f"Decryption error on payload {data[:15]}... : {e}")
        return "[Decryption Failed]"

def log_action(actor, action, details):
    """Writes system events to the audit_logs table using Postgres syntax."""
    db = get_db_connection()
    cursor = db.cursor() # Required for PostgreSQL
    try:
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
    cursor = db.cursor() 
    try:
        cursor.execute(
            "SELECT session_token FROM officers WHERE username = %s", 
            (username,)
        )
        user = cursor.fetchone()

        if user and user[0] and user[0] == client_token:
            return True
    except Exception as e:
        print(f"Session check error: {e}")
    finally:
        cursor.close()
        
    return False