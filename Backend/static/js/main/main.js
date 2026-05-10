import { elements } from './dom.js';
import { api as API } from './api.js';
import * as UI from './ui.js';
import { getActiveEventId, setActiveEventId } from './state.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://rmyfvexaudhevjiscozj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteWZ2ZXhhdWRoZXZqaXNjb3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODYyNTUsImV4cCI6MjA4NzI2MjI1NX0.9ua44_HqIYDfCRw5TPPCU4qZc53ujQQ3ELrKuHktIL0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Core Logic Functions ---

function startRealtimeListener(eventId) {
    console.log("Subscribing to realtime attendance updates for Event ID:", eventId);

    supabase
      .channel('public:attendance')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to any change
          schema: 'public',
          table: 'attendance',
          filter: `event_id=eq.${eventId}` 
        },
        (payload) => {
          console.log('New attendance recorded! Updating table...', payload);
          fetchAndRenderAttendanceList(); // Instantly update the UI
        }
      )
      .subscribe();
}

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
        startRealtimeListener(event.id);

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

        UI.showNotification(data.message, data.status || (checkInResponse.ok ? 'success' : 'error'));

        // Handle specific critical edge cases using the old banner, if you still want it for system alerts
        if (checkInResponse.status === 401) {
            UI.displayMessage(`Session Expired: Please log in again to continue scanning.`, 'error');
        } else if (checkInResponse.status === 409) {
            UI.displayMessage(`${data.message}`, 'error');
        }

    } catch (error) {
        console.error("Error during check-in API call:", error);
        // Changed to use the new toast for network errors as well for consistency
        UI.showNotification(`Check-in failed: ${error.message || 'Server did not respond correctly.'}`, 'error');
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