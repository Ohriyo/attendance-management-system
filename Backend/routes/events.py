from flask import Blueprint, request, jsonify
from database import get_db_connection
from helpers import log_action

events_bp = Blueprint('events', __name__)

@events_bp.route('/api/events', methods=['GET', 'POST'])
def manage_events():
    db = get_db_connection()
    cursor = db.cursor() # Get cursor for PostgreSQL
    
    if request.method == 'GET':
        # Updated: Changed table query for Postgres cursor execution
        cursor.execute("SELECT * FROM events ORDER BY date DESC")
        events = cursor.fetchall()
        cursor.close()
        return jsonify([dict(row) for row in events]), 200
    
    # POST: Create Event
    data = request.get_json()
    name = data.get('name')
    date = data.get('date')
    am_cutoff = data.get('am_cutoff', '12:00') 

    if not name or not date:
        cursor.close()
        return jsonify({'message': 'Missing event name or date.'}), 400

    try:
        # Updated: Changed '?' to '%s' and added RETURNING id for Postgres
        cursor.execute(
            "INSERT INTO events (name, date, am_cutoff) VALUES (%s, %s, %s) RETURNING id", 
            (name, date, am_cutoff)
        )
        new_id = cursor.fetchone()['id']
        
        log_action('Admin', 'CREATE_EVENT', f"Created event: {name} (Cutoff: {am_cutoff})")
        db.commit()
        return jsonify({'message': 'Event created', 'id': new_id}), 201
    except Exception as e:
        db.rollback() # Rollback transaction on error
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()

@events_bp.route('/api/active_event', methods=['GET', 'POST'])
def active_event():
    db = get_db_connection()
    cursor = db.cursor()
    
    if request.method == 'POST':
        # Updated: Changed '?' to '%s'
        cursor.execute("UPDATE settings SET value = %s WHERE key = 'active_event_id'", (str(request.get_json().get('event_id')),))
        db.commit()
        cursor.close()
        return jsonify({'message': 'Active event updated.'}), 200
    
    # Updated: SQLite execute() replaced with Postgres cursor.execute()
    cursor.execute("SELECT value FROM settings WHERE key = 'active_event_id'")
    setting = cursor.fetchone()
    
    if not setting: 
        cursor.close()
        return jsonify({'message': 'No active event.'}), 404
        
    # Updated: Changed '?' to '%s'
    cursor.execute("SELECT * FROM events WHERE id = %s", (int(setting['value']),))
    event = cursor.fetchone()
    cursor.close()
    
    return jsonify(dict(event)) if event else ({'message': 'Event not found'}, 404)

# Add these routes to your existing events.py file

@events_bp.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
def modify_event(event_id):
    db = get_db_connection()
    cursor = db.cursor()
    
    if request.method == 'PUT':
        data = request.get_json()
        name = data.get('name')
        date = data.get('date')

        if not name or not date:
            cursor.close()
            return jsonify({'message': 'Name and date are required.'}), 400

        try:
            # PostgreSQL syntax using %s placeholders
            cursor.execute(
                "UPDATE events SET name = %s, date = %s WHERE id = %s",
                (name, date, event_id)
            )
            # Log the action for your Audit Logs
            log_action('Admin', 'UPDATE_EVENT', f"Updated event ID {event_id} to: {name}")
            db.commit()
            return jsonify({'message': 'Event updated successfully.'}), 200
        except Exception as e:
            db.rollback()
            return jsonify({'message': str(e)}), 500
        finally:
            cursor.close()

    if request.method == 'DELETE':
        try:
            # First, fetch the name for the audit log
            cursor.execute("SELECT name FROM events WHERE id = %s", (event_id,))
            event = cursor.fetchone()
            event_name = event['name'] if event else f"ID {event_id}"

            # Delete the event
            cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
            
            log_action('Admin', 'DELETE_EVENT', f"Deleted event: {event_name}")
            db.commit()
            return jsonify({'message': 'Event deleted successfully.'}), 200
        except Exception as e:
            db.rollback()
            return jsonify({'message': str(e)}), 500
        finally:
            cursor.close()