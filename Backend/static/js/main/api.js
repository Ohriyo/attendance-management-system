import { API_BASE_URL } from './config.js';

const fetchEvents = async () => {
    const response = await fetch(`${API_BASE_URL}/api/active_event`);
    return response.json();
};

export async function fetchAttendance(eventId) {
    return await fetch(`${API_BASE_URL}/attendance/${eventId}`);
}

export async function fetchStudent(studentId) {
    return await fetch(`${API_BASE_URL}/student/${studentId}`);
}

export async function postCheckIn(payload) {
    return await fetch(`${API_BASE_URL}/check_in`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
}

export async function postLogin(credentials) {
    return await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
}   