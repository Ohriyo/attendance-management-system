import { API_BASE_URL } from './config.js';

// Generic Fetch Wrapper
const apiFetch = async (endpoint, options = {}) => {
    return fetch(`${API_BASE_URL}${endpoint}`, options);
};

export const api = {
    // Auth
    checkSession: (body) => apiFetch('/check_session', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    updatePassword: (body) => apiFetch('/update_password', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    
    // Officers
    getOfficers: () => apiFetch('/admin/officers', { cache: "no-store" }),
    createOfficer: (body) => apiFetch('/admin/officers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    updateOfficer: (username, body) => apiFetch(`/admin/officers/${username}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    
    // Students
    getStudents: () => apiFetch('/students'),
    updateStudent: (id, body) => apiFetch(`/students/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    promoteStudents: () => apiFetch('/admin/maintenance/promote', { method: 'POST' }),
    demoteStudents: (student_nos) => apiFetch('/admin/demote_year_level', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ student_nos }) }),
    checkDuplicates: () => apiFetch('/admin/maintenance/duplicates'),
    importStudents: (formData) => apiFetch('/admin/import_students', { method: 'POST', body: formData }),

    // Settings & Maintenance
    getSettings: () => apiFetch('/admin/settings'),
    saveSettings: (body) => apiFetch('/admin/settings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    getBackup: () => apiFetch('/admin/backup'),
    flushData: (body) => apiFetch('/admin/maintenance/flush', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }),
    
    // Logs & Sessions
    getLogs: () => apiFetch('/admin/logs'),
    getSessions: () => apiFetch('/admin/sessions'),
    revokeSession: (username) => apiFetch('/admin/sessions/revoke', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username }) })
};