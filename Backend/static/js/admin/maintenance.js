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
        showAlert('Backup Failed', 'Failed to generate backup. Please check your connection.', 'error');    
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

export async function loadArchivedEvents() {
    try {
        const response = await api.getArchivedEvents(); 
        const events = await response.json();
        const tbody = document.getElementById('archived-events-body');
        
        if (!events || events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No archived events found.</td></tr>`;
            return;
        }

        tbody.innerHTML = events.map(event => {
            // Format the deletion timestamp for better readability
            const dateObj = new Date(event.deleted_at);
            const formattedDeletedAt = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition group">
                    <td class="px-4 py-3 font-medium text-brand-dark dark:text-white">${event.name}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${event.date}</td>
                    <td class="px-4 py-3 text-red-500 dark:text-red-400">${formattedDeletedAt}</td>
                    <td class="px-4 py-3 text-right">
                        <button onclick="recoverEvent(${event.id})" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" title="Recover Event">
                            <i class="ph ph-clock-counter-clockwise text-xl"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Failed to load archived events:", error);
    }
}

export async function recoverEvent(eventId) {
    showConfirm(
        'Recover Event?', 
        'This will restore the event and all of its associated attendance records back to the main system.', 
        async () => {
            try {
                // Grab the currently logged-in admin's username
                const user = JSON.parse(localStorage.getItem('user_info'));
                const username = user ? user.username : 'Admin';

                // Pass it to the API
                const response = await api.recoverEvent(eventId, { username: username });
                const result = await response.json();

                if (response.ok) {
                    showAlert('Success', 'Event and attendance data successfully recovered.', 'success');
                    loadArchivedEvents(); 
                } else {
                    showAlert('Recovery Failed', result.message || 'Server error occurred.', 'error');
                }
            } catch (error) {
                console.error(error);
                showAlert('System Error', 'Network connection failed.', 'error');
            }
        }
    );
}