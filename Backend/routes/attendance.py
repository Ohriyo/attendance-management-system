from flask import Blueprint, request, jsonify, make_response
from datetime import datetime
import csv
from io import StringIO
from database import get_db_connection
from helpers import decrypt_data
from helpers import is_session_valid

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/api/check_in', methods=['POST'])
def check_in_student():
    data = request.get_json()
    event_id = data.get('event_id')
    student_no = data.get('student_no')

    if not event_id or not student_no:
        return jsonify({'message': 'Missing event_id or student_no.'}), 400

    db = get_db_connection()
    cursor = db.cursor() 
    
    # Validate Student
    cursor.execute("SELECT first_name, last_name FROM students WHERE student_no = %s", (student_no,))
    student_info = cursor.fetchone()
    
    if student_info is None:
        return jsonify({'message': f'Student ID {student_no} is not registered.'}), 404

    s_info = dict(student_info)
    real_first_name = decrypt_data(s_info['first_name'])
    
    cursor.execute("SELECT am_cutoff, attendance_mode FROM events WHERE id = %s", (event_id,))
    event_data = cursor.fetchone()

    cutoff_str = event_data['am_cutoff'] if event_data and event_data['am_cutoff'] else '12:00'
    mode = event_data['attendance_mode'] if event_data else 'IN'
    
    try:
        cutoff_time = datetime.strptime(cutoff_str, '%H:%M').time()
        current_time = datetime.now().time()
        is_am = current_time <= cutoff_time
        
        current_time_str = datetime.now().strftime('%I:%M %p') # For the UI Popup
        db_timestamp = datetime.now().isoformat()              # For PostgreSQL
    except ValueError:
        is_am = datetime.now().hour < 12
        current_time_str = datetime.now().strftime('%I:%M %p')
        db_timestamp = datetime.now().isoformat()

    cursor.execute(
        "SELECT * FROM attendance WHERE event_id = %s AND student_no = %s", 
        (event_id, student_no)
    )
    record = cursor.fetchone()

    message = ""
    status_type = "info"

    try:
        if mode == 'IN':
            if record is None:
                # First scan ever for this event
                time_col = 'am_in' if is_am else 'pm_in'
                cursor.execute(f"INSERT INTO attendance (event_id, student_no, {time_col}, status) VALUES (%s, %s, %s, 'Present')", 
                               (event_id, student_no, db_timestamp))
                message = f"Time IN recorded, {real_first_name}!"
                status_type = "in"
            else:
                record_id = record['id']
                # Record exists. Check if they already timed in for the current session (AM or PM)
                if is_am:
                    if record['am_in']:
                        return jsonify({'message': f"{real_first_name}, you have already Timed IN for the AM session.", 'status': 'error'}), 400
                    else:
                        cursor.execute("UPDATE attendance SET am_in = %s, status = 'Present' WHERE id = %s", (db_timestamp, record_id))
                        message = f"AM Time IN recorded, {real_first_name}."
                        status_type = "in"
                else: # is PM
                    if record['pm_in']:
                        return jsonify({'message': f"{real_first_name}, you have already Timed IN for the PM session.", 'status': 'error'}), 400
                    else:
                        cursor.execute("UPDATE attendance SET pm_in = %s, status = 'Present' WHERE id = %s", (db_timestamp, record_id))
                        message = f"PM Time IN recorded, {real_first_name}."
                        status_type = "in"

        # ---------------------------
        # TIME OUT MODE LOGIC
        # ---------------------------
        elif mode == 'OUT':
            if record is None:
                return jsonify({'message': f"Cannot Time OUT. No Time IN record found for {real_first_name}.", 'status': 'error'}), 400

            record_id = record['id']
            if is_am:
                if not record['am_in']:
                    return jsonify({'message': f"Cannot Time OUT. You haven't Timed IN for AM yet.", 'status': 'error'}), 400
                if record['am_out']:
                    return jsonify({'message': f"You have already Timed OUT for AM.", 'status': 'error'}), 400

                cursor.execute("UPDATE attendance SET am_out = %s WHERE id = %s", (db_timestamp, record_id))
                message = f"AM Time OUT recorded, {real_first_name}."
                status_type = "out"
            else: # is PM
                if not record['pm_in']:
                    return jsonify({'message': f"Cannot Time OUT. You haven't Timed IN for PM yet.", 'status': 'error'}), 400
                if record['pm_out']:
                    return jsonify({'message': f"You have already Timed OUT for PM.", 'status': 'error'}), 400

                cursor.execute("UPDATE attendance SET pm_out = %s WHERE id = %s", (db_timestamp, record_id))
                message = f"PM Time OUT recorded, {real_first_name}."
                status_type = "out"

        db.commit()
        return jsonify({'message': message, 'status': status_type, 'time': current_time_str, 'student_name': real_first_name}), 200 

    except Exception as e:
        db.rollback() 
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cursor.close()

@attendance_bp.route('/api/export/attendance/<int:event_id>', methods=['GET'])
def export_csv(event_id):
    db = get_db_connection()
    cursor = db.cursor()
    
    # Updated '?' to '%s'
    cursor.execute("SELECT name FROM events WHERE id = %s", (event_id,))
    event = cursor.fetchone()
    if not event: return jsonify({'message': 'Event not found'}), 404
    
    # Updated '?' to '%s'
    cursor.execute("""
        SELECT s.student_no, s.last_name, s.first_name, s.program, s.year_level, s.section,
               a.am_in, a.am_out, a.pm_in, a.pm_out, a.status
        FROM attendance a JOIN students s ON a.student_no = s.student_no
        WHERE a.event_id = %s AND a.deleted_at IS NULL 
        ORDER BY s.last_name ASC
    """, (event_id,))
    records = cursor.fetchall()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student No', 'Last Name', 'First Name', 'Program', 'Year', 'Section', 'AM In', 'AM Out', 'PM In', 'PM Out', 'Status'])
    
    for r in records:
        d_last = decrypt_data(r['last_name'])
        d_first = decrypt_data(r['first_name'])
        
        writer.writerow([r['student_no'], d_last, d_first, r['program'], r['year_level'], r['section'],
                         r['am_in'] or '', r['am_out'] or '', r['pm_in'] or '', r['pm_out'] or '', r['status']])
    
    cursor.close()
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = f"attachment; filename={event['name']}_Report.csv"
    response.headers['Content-type'] = 'text/csv'
    return response

@attendance_bp.route('/api/section_spreadsheet', methods=['GET'])
def section_spreadsheet():
    args = request.args
    db = get_db_connection()
    cursor = db.cursor()
    
    try:

        query = """
            SELECT s.student_no, s.last_name, s.first_name, 
                   a.am_in::text, a.am_out::text,
                   a.pm_in::text, a.pm_out::text, 
                   COALESCE(a.status, 'Absent') as status
            FROM students s 
            LEFT JOIN attendance a ON s.student_no = a.student_no AND a.event_id = %s AND a.deleted_at IS NULL
            WHERE s.program = %s AND s.year_level = %s AND s.section = %s 
            ORDER BY s.last_name ASC
        """
        cursor.execute(query, (args.get('event_id'), args.get('program'), args.get('year'), args.get('section')))
        results = cursor.fetchall()
        
        final_results = []
        for row in results:
            r = dict(row)
            # Decrypt names
            r['first_name'] = decrypt_data(r['first_name'])
            r['last_name'] = decrypt_data(r['last_name'])
            
            # Ensure nulls are handled gracefully for the frontend
            r['am_in'] = r['am_in'] if r['am_in'] else None
            r['am_out'] = r['am_out'] if r['am_out'] else None
            r['pm_in'] = r['pm_in'] if r['pm_in'] else None
            r['pm_out'] = r['pm_out'] if r['pm_out'] else None

            final_results.append(r)

        return jsonify(final_results), 200

    except Exception as e:
        db.rollback()
        print(f"Spreadsheet Error: {str(e)}") # Prints to your server console for debugging
        return jsonify({'message': 'Failed to generate spreadsheet', 'error': str(e)}), 500
        
    finally:
        cursor.close()

@attendance_bp.route('/api/attendance/<int:event_id>', methods=['GET'])
def get_attendance_list(event_id):
    db = get_db_connection()
    cursor = db.cursor()
    
    # Updated '?' to '%s'
    cursor.execute("""
        SELECT 
            s.student_no, s.first_name, s.middle_name, s.last_name, 
            s.program, s.year_level, s.section,
            a.am_in, a.am_out, a.pm_in, a.pm_out, a.status,
            e.date
        FROM attendance a
        JOIN students s ON a.student_no = s.student_no
        JOIN events e ON a.event_id = e.id
        WHERE a.event_id = %s AND a.deleted_at IS NULL
        ORDER BY a.id DESC
    """, (event_id,))
    attendance_records = cursor.fetchall()
    
    formatted_attendance = []
    for rec in attendance_records:
        rec_dict = dict(rec)
        rec_dict['date'] = str(rec_dict['date'])

        # Decrypt Names for Live Log 
        rec_dict['first_name'] = decrypt_data(rec_dict['first_name'])
        rec_dict['middle_name'] = decrypt_data(rec_dict['middle_name'])
        rec_dict['last_name'] = decrypt_data(rec_dict['last_name'])

        # Determine Time In
        if rec_dict['am_in']:
            rec_dict['time_in'] = rec_dict['am_in']
        elif rec_dict['pm_in']:
            rec_dict['time_in'] = rec_dict['pm_in']
        else:
            rec_dict['time_in'] = None # Changed from "--:--"

        # Determine Time Out
        if rec_dict['pm_out']:
             rec_dict['time_out'] = rec_dict['pm_out']
        elif rec_dict['am_out']:
             rec_dict['time_out'] = rec_dict['am_out']
        else:
             rec_dict['time_out'] = None # Changed from "--:--"

        formatted_attendance.append(rec_dict)
    
    cursor.close()
    return jsonify(formatted_attendance), 200

@attendance_bp.route('/api/stats/<int:event_id>', methods=['GET'])
def get_event_stats(event_id):
    db = get_db_connection()
    cursor = db.cursor()
    
    cursor.execute("SELECT COUNT(*) AS checked_in_count FROM attendance WHERE event_id = %s", (event_id,))
    stats_row = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) AS total_roster_size FROM students")
    roster_row = cursor.fetchone()

    cursor.close()
    return jsonify({
        'checked_in_count': stats_row['checked_in_count'],
        'total_roster_size': roster_row['total_roster_size']
    }), 200