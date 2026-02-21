import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import g, current_app
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Opens a new PostgreSQL connection using the URL from .env."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = psycopg2.connect(
            DATABASE_URL, 
            cursor_factory=RealDictCursor
        )
    return db

def close_connection(exception):
    """Closes the database connection at the end of the request."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db(app):
    """Initializes the PostgreSQL schema and populates initial data."""
    with app.app_context():
        db = get_db_connection()
        cursor = db.cursor()
        
        # --- Tables (Updated for PostgreSQL Syntax) ---
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                student_no TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                middle_name TEXT,
                last_name TEXT NOT NULL,
                program TEXT,
                year_level TEXT,
                section TEXT
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                am_cutoff TEXT DEFAULT '13:00'
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES events(id),
                student_no TEXT NOT NULL REFERENCES students(student_no),
                am_in TEXT, am_out TEXT, pm_in TEXT, pm_out TEXT,
                status TEXT DEFAULT 'Absent'
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS officers (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'officer',
                is_active BOOLEAN DEFAULT TRUE,
                session_token TEXT,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY, 
                value TEXT
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sections (
                id SERIAL PRIMARY KEY,
                program TEXT NOT NULL,
                year_level TEXT NOT NULL,
                name TEXT NOT NULL,
                UNIQUE (program, year_level, name)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                actor_username TEXT,
                action TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_student_no ON attendance(student_no);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(last_name, first_name);")     
           
        # Sections
        mock_sections = [('BSCS', '3rd Year', 'A'), ('BSIS', '3rd Year', 'B'), 
                         ('BSIT', '4th Year', 'C'), ('BSEMC', '1st Year', 'A')]
        for prog, year, name in mock_sections:
            cursor.execute("""
                INSERT INTO sections (program, year_level, name) 
                VALUES (%s, %s, %s) 
                ON CONFLICT DO NOTHING
            """, (prog, year, name))

        cursor.execute("INSERT INTO settings (key, value) VALUES ('active_event_id', '1') ON CONFLICT DO NOTHING")
        
        # Students
        cursor.execute("""
            INSERT INTO students (student_no, first_name, middle_name, last_name, program, year_level, section) 
            VALUES (%s, %s, %s, %s, %s, %s, %s) 
            ON CONFLICT DO NOTHING
        """, ('23-00951', 'Rio', 'P', 'Pana', 'BSCS', '3rd Year', 'A'))

        env_officer_pw = os.getenv('OFFICER_PASSWORD', 'default_officer_pass')
        env_admin_pw = os.getenv('ADMIN_PASSWORD', 'default_admin_pass')

        # Officers (Check existence before inserting)
        cursor.execute("SELECT 1 FROM officers WHERE username = %s", ('officer',))
        if not cursor.fetchone():
             hashed_pw = generate_password_hash(env_officer_pw)
             cursor.execute("INSERT INTO officers (username, password_hash, role) VALUES (%s, %s, %s)", 
                            ('officer', hashed_pw, 'officer'))
             
        cursor.execute("SELECT 1 FROM officers WHERE username = %s", ('admin',))
        if not cursor.fetchone():
             hashed_admin_pw = generate_password_hash(env_admin_pw)
             cursor.execute("INSERT INTO officers (username, password_hash, role) VALUES (%s, %s, %s)", 
                            ('admin', hashed_admin_pw, 'admin'))

        db.commit() 
        cursor.close()
        print("PostgreSQL Database initialized.")