import { elements } from './dom.js';
import * as API from './api.js';
import * as UI from './ui.js';
import { getActiveEventId, setActiveEventId } from './state.js';

// --- Core Logic Functions ---

async function fetchAndRenderAttendanceList() {
    const activeEventId = getActiveEventId();
    if (!activeEventId) return; 

    try {
        const response = await API.fetchAttendance(activeEventId);
        
        if (!response.ok) {
            if (response.status === 404) {
                 UI.populateAttendanceTable([]);
                 return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        UI.populateAttendanceTable(data); 
    } catch (error) {
        console.error("Error fetching attendance list:", error);
        UI.populateAttendanceTable([]); 
    }
}

async function loadActiveEvent() {
    try {
        const response = await API.fetchActiveEvent();
        
        if (!response.ok) {
            UI.displayMessage('⚠️ No event is currently active. Please ask an officer to start the event.', 'error');
            UI.setSystemOffline();
            return;
        }

        const event = await response.json();
        setActiveEventId(event.id);

        UI.updateEventTitle(event.name);
        console.log(`System linked to Active Event: ${event.name} (ID: ${event.id})`);
        fetchAndRenderAttendanceList();

    } catch (error) {
        console.error('Failed to load active event:', error);
        UI.displayMessage('Connection Error: Could not verify active event.', 'error');
    }
}

// --- Event Listeners ---

// 1. Theme Toggle
if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', UI.toggleTheme);
}

// 2. Kiosk Submission Handler
elements.attendanceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    let activeEventId = getActiveEventId();

    if (!activeEventId) {
        UI.displayMessage('System Standby: No active event found.', 'error');
        loadActiveEvent(); 
        return;
    }
    const studentId = elements.studentIdInput.value.trim().toUpperCase(); 
    elements.studentIdInput.value = ''; 
    elements.studentIdInput.focus();

    if (!studentId) {
        UI.displayMessage('Please enter your Student ID Number.', 'error');
        return;
    }
    
    // --- Fetch Student Info ---
    let studentInfo;
    try {
        const studentResponse = await API.fetchStudent(studentId);

        if (!studentResponse.ok) {
            const errorData = await studentResponse.json();
            if (studentResponse.status === 404) {
                 UI.displayMessage(`Error: ${errorData.message}`, 'error');
                 return;
            }
            throw new Error(`Student lookup failed: ${studentResponse.status}`);
        }
        
        studentInfo = await studentResponse.json();
        UI.renderStudentInfo(studentInfo);

    } catch (error) {
        console.error("Error checking student ID:", error);
        UI.displayMessage('Connection error during student lookup. Check server status.', 'error');
        return;
    }
    
    // --- Post Check-In Record ---
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_info'));

    try {
        const checkInResponse = await API.postCheckIn({
            event_id: activeEventId, 
            student_no: studentId,
            username: user ? user.username : null, 
            token: token
        });
        
        const data = await checkInResponse.json();

        if (checkInResponse.ok) {
            if (data.status === 'in') {
                UI.displayMessage(`TIME-IN SUCCESS! Welcome, ${studentInfo.first_name}. (${data.time})`, 'success');
            } else if (data.status === 'out') {
                UI.displayMessage(`TIME-OUT SUCCESS! Goodbye, ${studentInfo.first_name}. (${data.time})`, 'info'); 
            }
        } else if (checkInResponse.status === 401) {
            // Handle revoked/expired sessions specifically
            UI.displayMessage(`Session Expired: Please log in again to continue scanning.`, 'error');
        } else if (checkInResponse.status === 409) {
            UI.displayMessage(`${data.message}`, 'error');
        }

    } catch (error) {
        console.error("Error during check-in API call:", error);
        UI.displayMessage(`Check-in failed: ${error.message || 'Server did not respond correctly.'}`, 'error');
        return;
    }
    
    // --- Refresh Attendance List ---
    fetchAndRenderAttendanceList();
});

// 3. Officer Login Modals
elements.officerLoginButton.addEventListener('click', UI.openOfficerModal);
elements.closeModalButton.addEventListener('click', UI.closeOfficerModal);

// 4. Officer Login Form
elements.officerLoginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = elements.officerUsernameInput.value.trim();
    const password = elements.officerPasswordInput.value;
    
    UI.setOfficerMessage('Logging in...', 'text-gray-400');
    
    try {
        const response = await API.postLogin({ username, password });
        const data = await response.json();

        if (response.ok) {
            UI.setOfficerMessage(`Login successful! Welcome, ${data.user.username}.`, 'text-green-500');

            // Store essential session data
            localStorage.setItem('auth_token', data.token);             
            localStorage.setItem('user_info', JSON.stringify(data.user)); 

            const target = data.user.role === 'admin' ? './admin_dashboard.html' : './officer_dashboard.html';

            setTimeout(() => {
                UI.closeOfficerModal();
                // SECURE REDIRECT
                window.location.replace(target); 
            }, 500);

        } else {
            UI.setOfficerMessage(data.message || 'Invalid credentials.', 'text-red-500');
            elements.officerLoginForm.reset();
        }
    } catch (error) {
        console.error('Login error:', error);
        UI.setOfficerMessage('Connection error. Check server status.', 'text-red-500');
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check local storage on load (Theme)
    UI.initTheme();

    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_info'));
    
    if (token && user) {
        const target = user.role === 'admin' ? 'admin_dashboard.html' : 'officer_dashboard.html';
        window.location.replace(target); 
        return;
    }

    UI.resetStudentDisplay();
    loadActiveEvent();
});