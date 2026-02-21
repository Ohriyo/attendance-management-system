import { api } from './api.js';
import { showConfirm, showAlert } from './ui.js';

export async function downloadBackup() {
    try {
        const response = await api.getBackup();
        const data = await response.json();   
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `NWSSU_Backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); 
    } catch (error) {
        alert("Failed to generate backup.");
    }
}

export async function flushAttendance() {
    // 1. Prepare the UI
    const input = document.getElementById('confirm-input');
    input.classList.remove('hidden'); 
    input.value = ''; 
    input.focus();

    // 2. Show the Modal with Custom Logic
    showConfirm(
        'Flush Attendance Data?', 
        '⚠️ DANGER: This will delete ALL attendance records. To confirm, please type "CONFIRM" in the box below.', 
        async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user_info'));
                const username = user ? user.username : 'admin';

                const response = await api.flushData({ 
                    target: 'attendance',
                    username: username 
                });
                
                const result = await response.json();

                if (response.ok) {
                    showAlert('Data Wiped', 'All attendance records have been successfully deleted.', 'success');
                } else {
                    showAlert('Flush Failed', `Server Error: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error(error);
                showAlert('System Error', 'Network connection failed.', 'error');
            }
        }
    );
}