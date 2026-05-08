import { API_BASE_URL } from './config.js';

export async function fetchActiveEvent() {
    return await fetch(`${API_BASE_URL}/active_event`);
}

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