import { API_BASE_URL } from './config.js';

// Generic Fetch Wrapper (Optional but keeps code clean)
const apiFetch = async (endpoint, options = {}) => {
    return fetch(`${API_BASE_URL}${endpoint}`, options);
};

export const api = {
    fetchActiveEvent: () => apiFetch('/api/active_event'),
    
    fetchAttendance: (eventId) => apiFetch(`/api/attendance/${eventId}`),
    
    fetchStudent: (studentId) => apiFetch(`/api/student/${studentId}`),
    
    postCheckIn: (data) => apiFetch('/api/check_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    
    postLogin: (credentials) => apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    })
};  