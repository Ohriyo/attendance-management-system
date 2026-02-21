import { api } from './api.js';
import { showAlert, showConfirm } from './ui.js';

export function forceLogout() {
    localStorage.clear();
    window.location.replace('index.html');
}

export async function validateSession() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_info'));

    if (!token || !user) {
        forceLogout();
        return;
    }

    try {
        const response = await api.checkSession({ token, username: user.username });
        if (response.status === 401) forceLogout();
    } catch (error) {
        console.error("Session check failed", error);
    }
}

export async function loadActiveSessions() {
    const tbody = document.getElementById('sessions-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-400">Loading...</td></tr>'
    try {
        const response = await api.getSessions();
        const sessions = await response.json();
        tbody.innerHTML = '';
        const currentUser = JSON.parse(localStorage.getItem('user_info'))?.username || '';
        sessions.forEach(s => {
            const isMe = s.username === currentUser;
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-50 dark:border-gray-700/50';
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-brand-dark dark:text-white">
                    ${s.username} ${isMe ? '(You)' : ''}
                </td>
                <td class="px-4 py-3 text-xs uppercase tracking-wide text-gray-500">${s.role}</td>
                <td class="px-4 py-3 text-gray-500">${s.last_login || 'Unknown'}</td>
                <td class="px-4 py-3 text-right">
                    ${!isMe ? `
                    <button onclick="revokeSession('${s.username}')" class="text-xs text-red-600 hover:text-red-800 hover:underline">
                        Force Logout
                    </button>` : '<span class="text-xs text-green-500">Active</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-red-400">Error loading sessions.</td></tr>';
    }
}

export function revokeSession(username) {
    showConfirm(
        'Force Logout?', 
        `Are you sure you want to force logout ${username}? They will be kicked out on their next action.`, 
        async () => {
            try {
                const response = await api.revokeSession(username);
                if (response.ok) {
                    showAlert('Session Revoked', `${username} has been successfully logged out.`, 'success');
                    loadActiveSessions(); 
                } else {
                    showAlert('Error', 'Failed to revoke session.', 'error');
                }
            } catch (error) {
                console.error(error);
                showAlert('Network Error', 'Could not connect to the server.', 'error');
            }
        }
    );
}

export async function updateMyPassword(currentPassword, newPassword) {
    const user = JSON.parse(localStorage.getItem('user_info'));
    const token = localStorage.getItem('auth_token');

    try {
        const response = await api.updatePassword({
            username: user.username,
            token: token,
            current_password: currentPassword,
            new_password: newPassword
        });
        const result = await response.json();
        if (response.ok) {
            showAlert('Success', result.message, 'success');
        } else {
            showAlert('Update Failed', result.message, 'error');
        }
    } catch (error) {
        showAlert('Error', 'Connection to server lost.', 'error');
    }
}