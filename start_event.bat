@echo off
echo Installing dependencies...
pip install -r Backend/requirements.txt

echo Running database setup...
python -c "from app import app; from database import init_db; init_db(app)"

echo Starting Waitress WSGI Server...
waitress-serve --port=5000 --threads=4 app:app
pause