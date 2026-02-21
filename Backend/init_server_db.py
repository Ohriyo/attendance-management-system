from app import app
from database import init_db

if __name__ == '__main__':
    print("Connecting to PostgreSQL and checking schema...")
    try:
        init_db(app)
        print("Database successfully initialized with tables and indexes.")
    except Exception as e:
        print(f"Initialization failed: {e}")