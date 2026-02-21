import os
from flask import Flask, render_template
from flask_cors import CORS
from database import init_db, close_connection
from dotenv import load_dotenv
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.students import students_bp
from routes.events import events_bp
from routes.attendance import attendance_bp

load_dotenv()
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

CORS(app, resources={r"/*": {
    "origins": ["http://127.0.0.1:5501", "http://localhost:5501", "http://127.0.0.1:5000"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}}, supports_credentials=True)
# Register Teardown Context
app.teardown_appcontext(close_connection)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(students_bp)
app.register_blueprint(events_bp)
app.register_blueprint(attendance_bp)

@app.route('/index.html')
def index():
    return render_template('index.html')

@app.route('/officer_dashboard.html')
def officer_dashboard():
    return render_template('officer_dashboard.html')

@app.route('/admin_dashboard.html')
def admin_dashboard():
    return render_template('admin_dashboard.html')

if __name__ == '__main__':
    init_db(app) 
    app.run(debug=True, port=5000)