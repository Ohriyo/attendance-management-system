import { API_BASE_URL } from './config.js';
export const checkSession = async (payload) => 
    fetch(`${API_BASE_URL}/api/check_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

// --- Students ---
export const fetchStudents = async () => fetch(`${API_BASE_URL}/api/students`);

export const fetchAvailableSections = async (program, year) => 
    fetch(`${API_BASE_URL}/api/students/available_sections?program=${program}&year_level=${year}`);

export const saveStudent = async (url, method, data) => 
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

export const deleteStudent = async (id) => 
    fetch(`${API_BASE_URL}/api/students/${id}`, { method: 'DELETE' });

// --- Sections ---
export const fetchSections = async () => fetch(`${API_BASE_URL}/api/sections`);

export const createSection = async (data) => 
    fetch(`${API_BASE_URL}/api/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

export const deleteSection = async (id) => 
    fetch(`${API_BASE_URL}/api/sections/${id}`, { method: 'DELETE' });

export const fetchSpreadsheet = async (eventId, program, year, section) => 
    fetch(`${API_BASE_URL}/api/section_spreadsheet?event_id=${eventId}&program=${program}&year=${year}&section=${section}`);

// --- Events ---
export const fetchEvents = async () => fetch(`${API_BASE_URL}/api/events`);

export const saveEvent = async (url, method, data) =>
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

export async function deleteEvent(eventId, body) {
    return fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body) 
    });
}

export const setActiveEvent = async (eventId) => 
    fetch(`${API_BASE_URL}/api/active_event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId })
    });

export const fetchActiveEvent = async () => fetch(`${API_BASE_URL}/api/active_event`);

// --- Stats & Attendance ---
export const fetchStats = async (eventId) => fetch(`${API_BASE_URL}/api/stats/${eventId}`);
export const fetchAttendance = async (eventId) => fetch(`${API_BASE_URL}/api/attendance/${eventId}`);
export const exportAttendance = async (eventId) => fetch(`${API_BASE_URL}/api/export/attendance/${eventId}`);