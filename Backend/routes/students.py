from flask import Blueprint, request, jsonify
import pandas as pd
import psycopg2 # Updated: Changed from sqlite3 to psycopg2
from database import get_db_connection
from helpers import log_action, encrypt_data, decrypt_data

students_bp = Blueprint('students', __name__)

# Decrypt Logic
@students_bp.route('/api/students', methods=['GET', 'POST'], strict_slashes=False)
def manage_students():
    db = get_db_connection()
    cursor = db.cursor() # PostgreSQL requires a cursor
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM students ORDER BY last_name ASC")
        students = cursor.fetchall()
        student_list = []
        
        for row in students:
            s = dict(row)
            s['first_name'] = decrypt_data(s['first_name'])
            s['middle_name'] = decrypt_data(s['middle_name'])
            s['last_name'] = decrypt_data(s['last_name'])
            student_list.append(s)
            
        cursor.close()
        return jsonify(student_list), 200
    
    # Encrypt Logic (Create Student)
    data = request.get_json()
    try:
        # ENCRYPT sensitive fields before SQL Insert
        enc_first = encrypt_data(data['first_name'])
        enc_middle = encrypt_data(data.get('middle_name', ''))
        enc_last = encrypt_data(data['last_name'])

        # Updated: Changed '?' to '%s'
        cursor.execute("""INSERT INTO students (student_no, first_name, middle_name, last_name, program, year_level, section)
                      VALUES (%s, %s, %s, %s, %s, %s, %s)""", 
                      (data['student_no'], enc_first, enc_middle, enc_last, 
                       data['program'], data['year_level'], data['section']))
        db.commit()
        return jsonify({'message': 'Student added.'}), 201
    except psycopg2.IntegrityError: # Updated: Changed to psycopg2 error
        db.rollback()
        return jsonify({'message': 'Student Number exists.'}), 409
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

@students_bp.route('/api/students/<student_no>', methods=['PUT'])
def update_student(student_no):
    data = request.get_json()
    db = get_db_connection()
    cursor = db.cursor()
    try:
        enc_first = encrypt_data(data['first_name'])
        enc_middle = encrypt_data(data.get('middle_name', ''))
        enc_last = encrypt_data(data['last_name'])

        # Updated: Changed '?' to '%s'
        cursor.execute("""UPDATE students 
                      SET first_name = %s, middle_name = %s, last_name = %s, 
                          program = %s, year_level = %s, section = %s
                      WHERE student_no = %s""",
                   (enc_first, enc_middle, enc_last,
                    data['program'], data['year_level'], data['section'], 
                    student_no))
        
        db.commit()
        return jsonify({'message': 'Student updated successfully.'}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

# Encrypt Logic (Import)
@students_bp.route('/api/admin/import_students', methods=['POST'])
def import_students():
    if 'file' not in request.files: return jsonify({'message': 'No file'}), 400
    file = request.files['file']
    db = get_db_connection()
    cursor = db.cursor()
    try:
        df = pd.read_csv(file)
        df = df.fillna('')
        df['student_no'] = df['student_no'].astype(str)
        
        # Handle encryption
        if 'first_name' in df.columns:
            df['first_name'] = df['first_name'].apply(encrypt_data)
        if 'middle_name' in df.columns:
            df['middle_name'] = df['middle_name'].apply(encrypt_data)
        if 'last_name' in df.columns:
            df['last_name'] = df['last_name'].apply(encrypt_data)
        
        # Create tuple list
        students_data = [(r['student_no'].strip(), r['first_name'], r.get('middle_name', ''), 
                          r['last_name'], r['program'].strip(), r['year_level'].strip(), r['section'].strip()) 
                         for _, r in df.iterrows()]
        
        # Updated: Postgres uses ON CONFLICT instead of INSERT OR REPLACE
        # Change '?' to '%s'
        query = """
            INSERT INTO students (student_no, first_name, middle_name, last_name, program, year_level, section) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (student_no) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                middle_name = EXCLUDED.middle_name,
                last_name = EXCLUDED.last_name,
                program = EXCLUDED.program,
                year_level = EXCLUDED.year_level,
                section = EXCLUDED.section
        """
        cursor.executemany(query, students_data)
        
        log_action('admin', 'IMPORT_STUDENTS', f'Imported {len(students_data)} students')
        db.commit()
        return jsonify({'message': 'Import successful', 'count': len(students_data)}), 201
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

@students_bp.route('/api/sections', methods=['GET', 'POST'])
def manage_sections():
    db = get_db_connection()
    cursor = db.cursor()
    if request.method == 'GET':
        cursor.execute("SELECT * FROM sections ORDER BY year_level, name ASC")
        sections = cursor.fetchall()
        cursor.close()
        return jsonify([dict(row) for row in sections]), 200
    
    data = request.get_json()
    try:
        # Updated: Changed '?' to '%s'
        cursor.execute("INSERT INTO sections (program, year_level, name) VALUES (%s, %s, %s)", 
                   (data['program'], data['year_level'], data['name']))
        db.commit()
        return jsonify({'message': 'Section added.'}), 201
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

# Decrypt Logic
@students_bp.route('/api/student/<student_no>', methods=['GET'])
def get_student_info(student_no):
    db = get_db_connection()
    cursor = db.cursor()
    # Updated: Changed '?' to '%s'
    cursor.execute("SELECT * FROM students WHERE student_no = %s", (student_no,))
    student_row = cursor.fetchone()
    cursor.close()

    if student_row is None:
        return jsonify({'message': f'Student ID {student_no} is not registered.'}), 404

    # Convert to dict
    student = dict(student_row)
    
    student['first_name'] = decrypt_data(student['first_name'])
    student['middle_name'] = decrypt_data(student['middle_name'])
    student['last_name'] = decrypt_data(student['last_name'])

    return jsonify(student), 200

@students_bp.route('/api/students/<student_no>', methods=['DELETE'])
def delete_student(student_no):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        # Updated: Changed '?' to '%s'
        cursor.execute("DELETE FROM students WHERE student_no = %s", (student_no,))
        db.commit()
        return jsonify({'message': 'Student deleted.'}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

@students_bp.route('/api/students/available_sections', methods=['GET'])
def get_available_roster_sections():
    """
    Returns all defined sections for a program and year from the sections table,
    ensuring sections appear even if they have no students.
    """
    program = request.args.get('program')
    year = request.args.get('year_level')
    
    db = get_db_connection()
    cursor = db.cursor()
    
    try:
        # Source from the 'sections' table to show empty sections
        query = "SELECT name FROM sections WHERE 1=1"
        params = []
        
        if program and program != 'All':
            query += " AND program = %s"
            params.append(program)
            
        if year and year != 'All':
            query += " AND year_level = %s"
            params.append(year)
            
        query += " ORDER BY name ASC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        # Extract the 'name' field from the section records
        sections = [row['name'] for row in rows]
        
        return jsonify(sections), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()