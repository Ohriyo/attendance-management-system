import * as API from './api.js';

export function forceLogout() {
    localStorage.clear();
    window.location.replace('/'); // Overwrites history
}

export async function validateSession() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_info'));

    if (!token || !user) {
        forceLogout();
        return;
    }

    try {
        const response = await API.checkSession({ token, username: user.username });
        if (response.status === 401) {
            forceLogout();
        }
    } catch (error) {
        console.error("Connection lost, but staying on page for offline mode.");
    }
}

export function startSessionCheckInterval() {
    setInterval(async () => {
        const token = localStorage.getItem('auth_token');
        const user = JSON.parse(localStorage.getItem('user_info'));
        
        if (token && user) {
            try {
                const response = await API.checkSession({ 
                    username: user.username, 
                    token: token 
                });
    
                if (response.status === 401) {
                    showAlert('Session Revoked', 'Your session has been revoked by the administrator.', 'error');
                    localStorage.clear();
                   window.location.href = '/';
                }
            } catch (error) {
                console.log("Session check skipped (network error)");
            }
        }
    }, 5000);
}