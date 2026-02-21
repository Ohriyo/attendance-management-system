import { api } from './api.js';
import { setupThemeToggle, setupModalHelpers, showConfirm, closeStatusModal } from './ui.js';
import { validateSession, forceLogout, loadActiveSessions, revokeSession, updateMyPassword } from './auth.js';
import { loadOfficerList, deleteOfficer, setupCreateOfficerForm, openEditModal, saveOfficerChanges, closeEditModal } from './officers.js';
import { loadStudentList, setupStudentSearch, openStudentEdit, saveStudentChanges, confirmPromotion, confirmDemotion, checkDuplicates, toggleSelectAll } from './students.js';
import { setupFileInputListener, clearFile, handleCSVUpload } from './import.js';
import { loadGlobalSettings, saveGlobalSettings } from './settings.js';
import { downloadBackup, flushAttendance } from './maintenance.js';
import { loadAuditLogs } from './logs.js';

// --- Expose Globals for HTML onclick attributes ---
window.closeStatusModal = closeStatusModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteOfficer = deleteOfficer;
window.saveOfficerChanges = saveOfficerChanges;
window.clearFile = clearFile;
window.handleCSVUpload = handleCSVUpload;
window.saveGlobalSettings = saveGlobalSettings;
window.openStudentEdit = openStudentEdit;
window.saveStudentChanges = saveStudentChanges;
window.confirmPromotion = confirmPromotion;
window.checkDuplicates = checkDuplicates;
window.downloadBackup = downloadBackup;
window.flushAttendance = flushAttendance;
window.revokeSession = revokeSession;
window.confirmDemotion = confirmDemotion;
window.toggleSelectAll = toggleSelectAll;
window.updateMyPassword = updateMyPassword;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user_info'));
    
    // 1. Role Check
    if (!user || user.role !== 'admin') {
        forceLogout();
        return;
    }

    // 2. Validate Token
    await validateSession();

    // 3. Setup UI
    setupAdminNav();
    setupThemeToggle();
    setupModalHelpers();

    // 4. Load Initial View
    loadOfficerList();
    setupCreateOfficerForm();
    
    // 5. Setup Other Listeners
    setupFileInputListener();
    setupStudentSearch();

    // 6. Auto-Logout Check
    startSessionCheck();
});

// Prevent Back Button
window.onpageshow = function(event) {
    if (event.persisted) {
        window.location.reload();
    }
};

function setupAdminNav() {
    const navLinks = document.querySelectorAll('nav a[data-view]');
    const activeClass = 'nav-item-active';

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove(activeClass));
            link.classList.add(activeClass);

            document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
            const viewId = link.getAttribute('data-view');
            const viewSection = document.getElementById(viewId + '-view');
            
            if(viewSection) {
                viewSection.classList.remove('hidden');
                viewSection.classList.add('animate-fade-in');
            }

            // Router
            if (viewId === 'settings') loadGlobalSettings();
            if (viewId === 'students') loadStudentList();
            if (viewId === 'logs') loadAuditLogs();
            if (viewId === 'security') loadActiveSessions();
        });
    });

    if(navLinks.length > 0) {
        navLinks[0].classList.add(activeClass);
    }

    // --- UPDATED SAFE LOGOUT LOGIC ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showConfirm(
                'Sign Out',
                'Are you sure you want to end your session?',
                () => forceLogout()
            );
        });
    }
}

function startSessionCheck() {
    setInterval(async () => {
        const token = localStorage.getItem('auth_token');
        const user = JSON.parse(localStorage.getItem('user_info'));
        
        if (token && user) {
            try {
                const res = await api.checkSession({ token: token, username: user.username });
                if (res.status === 401) {
                    alert("Your session has expired or was revoked by an admin.");
                    forceLogout();
                }
            } catch(e) {}
        }
    }, 10000);
}