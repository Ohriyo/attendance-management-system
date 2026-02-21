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

    # --- SECURITY UPDATE: Session Verification ---
    # officer_username = data.get('username')
    # session_token = data.get('token')

    # if not is_session_valid(officer_username, session_token):
    #   return jsonify({'message': 'Session revoked or invalid. Please login again.'}), 401

    event_id = data.get('event_id')
    student_no = data.get('student_no')

    if not event_id or not student_no:
        return jsonify({'message': 'Missing event_id or student_no.'}), 400

    db = get_db_connection()
    cursor = db.cursor() # PostgreSQL requires a cursor object
    
    # Validate Student - Updated '?' to '%s'
    cursor.execute("SELECT first_name, last_name FROM students WHERE student_no = %s", (student_no,))
    student_info = cursor.fetchone()
    
    if student_info is None:
        return jsonify({'message': f'Student ID {student_no} is not registered.'}), 404

    # Convert Row to dict so we can use the data
    s_info = dict(student_info)
    real_first_name = decrypt_data(s_info['first_name'])
    
    # Updated '?' to '%s'
    cursor.execute("SELECT am_cutoff FROM events WHERE id = %s", (event_id,))
    event_data = cursor.fetchone()
    
    cutoff_str = event_data['am_cutoff'] if event_data and event_data['am_cutoff'] else '12:00'
    
    try:
        cutoff_time = datetime.strptime(cutoff_str, '%H:%M').time()
        current_time = datetime.now().time()
        is_am = current_time <= cutoff_time
        current_time_str = datetime.now().strftime('%I:%M %p')
    except ValueError:
        is_am = datetime.now().hour < 12
        current_time_str = datetime.now().strftime('%I:%M %p')

    # Updated '?' to '%s'
    cursor.execute(
        "SELECT * FROM attendance WHERE event_id = %s AND student_no = %s", 
        (event_id, student_no)
    )
    record = cursor.fetchone()

    message = ""
    status_type = "info"

    try:
        if record is None:
            # CREATE NEW RECORD - Updated '?' to '%s'
            if is_am:
                cursor.execute("INSERT INTO attendance (event_id, student_no, am_in, status) VALUES (%s, %s, %s, 'Present')", 
                           (event_id, student_no, current_time_str))
                message = f"Good Morning, {real_first_name}! (AM IN)"
                status_type = "in"
            else:
                cursor.execute("INSERT INTO attendance (event_id, student_no, pm_in, status) VALUES (%s, %s, %s, 'Present')", 
                           (event_id, student_no, current_time_str))
                message = f"Good Afternoon, {real_first_name}! (PM IN)"
                status_type = "in"
        else:
            # UPDATE EXISTING RECORD
            record_id = record['id']
            
            if is_am:
                if not record['am_in']:
                    # Updated '?' to '%s'
                    cursor.execute("UPDATE attendance SET am_in = %s, status = 'Present' WHERE id = %s", (current_time_str, record_id))
                    message = f"AM Time-IN recorded for {real_first_name}."
                    status_type = "in"
                elif not record['am_out']:
                    # Updated '?' to '%s'
                    cursor.execute("UPDATE attendance SET am_out = %s WHERE id = %s", (current_time_str, record_id))
                    message = f"AM Time-OUT recorded for {real_first_name}."
                    status_type = "out"
                else:
                    message = f"You have already completed your AM attendance, {real_first_name}."
                    status_type = "completed"
            
            else: 
                # Logic for PM
                if not record['pm_in']:
                    # Updated '?' to '%s'
                    cursor.execute("UPDATE attendance SET pm_in = %s, status = 'Present' WHERE id = %s", (current_time_str, record_id))
                    message = f"PM Time-IN recorded for {real_first_name}."
                    status_type = "in"
                elif not record['pm_out']:
                    # Updated '?' to '%s'
                    cursor.execute("UPDATE attendance SET pm_out = %s WHERE id = %s", (current_time_str, record_id))
                    message = f"PM Time-OUT recorded for {real_first_name}."
                    status_type = "out"
                else:
                    message = f"You have already completed your PM attendance, {real_first_name}."
                    status_type = "completed"

        db.commit()
        return jsonify({
            'message': message,
            'status': status_type,
            'time': current_time_str,
            'student_name': real_first_name # Send clean name to frontend
        }), 200 

    except Exception as e:
        db.rollback() # Rollback on error
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
        WHERE a.event_id = %s ORDER BY s.last_name ASC
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
    
    # Updated '?' to '%s'
    query = """
        SELECT s.student_no, s.last_name, s.first_name, 
               COALESCE(a.am_in, '') as am_in, COALESCE(a.am_out, '') as am_out,
               COALESCE(a.pm_in, '') as pm_in, COALESCE(a.pm_out, '') as pm_out, COALESCE(a.status, 'Present') as status
        FROM students s LEFT JOIN attendance a ON s.student_no = a.student_no AND a.event_id = %s
        WHERE s.program = %s AND s.year_level = %s AND s.section = %s ORDER BY s.last_name ASC
    """
    cursor.execute(query, (args.get('event_id'), args.get('program'), args.get('year'), args.get('section')))
    results = cursor.fetchall()
    
    final_results = []
    for row in results:
        r = dict(row)
        r['first_name'] = decrypt_data(r['first_name'])
        r['last_name'] = decrypt_data(r['last_name'])
        final_results.append(r)

    cursor.close()
    return jsonify(final_results), 200

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
        WHERE a.event_id = %s
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
            rec_dict['time_in'] = f"{rec_dict['am_in']}"
        elif rec_dict['pm_in']:
            rec_dict['time_in'] = f"{rec_dict['pm_in']}"
        else:
            rec_dict['time_in'] = "--:--"

        # Determine Time Out
        if rec_dict['pm_out']:
             rec_dict['time_out'] = f"{rec_dict['pm_out']}"
        elif rec_dict['am_out']:
             rec_dict['time_out'] = f"{rec_dict['am_out']}"
        else:
             rec_dict['time_out'] = "--:--"

        formatted_attendance.append(rec_dict)
    
    cursor.close()
    return jsonify(formatted_attendance), 200

@attendance_bp.route('/api/stats/<int:event_id>', methods=['GET'])
def get_event_stats(event_id):
    db = get_db_connection()
    cursor = db.cursor()
    
    # Use 'AS' so the dictionary key matches your dashboard.js requirements
    cursor.execute("SELECT COUNT(*) AS checked_in_count FROM attendance WHERE event_id = %s", (event_id,))
    stats_row = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) AS total_roster_size FROM students")
    roster_row = cursor.fetchone()

    cursor.close()
    return jsonify({
        'checked_in_count': stats_row['checked_in_count'],
        'total_roster_size': roster_row['total_roster_size']
    }), 200