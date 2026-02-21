import { validateSession, startSessionCheckInterval } from './auth.js';
import { setupNavigation, setupThemeToggle } from './ui.js';
import { loadMonitoringView } from './monitoring.js';

// Import functions that need to be exposed to window for HTML onclick events
import { 
    sortRoster, editStudent, deleteStudent, openStudentModal, closeStudentModal,
    executeStudentDelete, closeDeleteStudentModal 
} from './students.js';

import { 
    navigateDown, stepBackFolder, openCreateSectionModal, closeCreateSectionModal,
    confirmDeleteSection, closeDeleteSectionModal, executeSectionDelete 
} from './sections.js';

import { openSpreadsheetView } from './spreadsheet.js';

import { 
    populateEventForm, deleteEvent, closeDeleteEventModal, openEventModal, closeEventModal 
} from './events.js';

// --- Global Assignments for HTML Event Handlers ---
window.sortRoster = sortRoster;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.executeStudentDelete = executeStudentDelete;
window.closeDeleteStudentModal = closeDeleteStudentModal;

window.navigateDown = navigateDown;
window.stepBackFolder = stepBackFolder;
window.openCreateSectionModal = openCreateSectionModal;
window.closeCreateSectionModal = closeCreateSectionModal;
window.confirmDeleteSection = confirmDeleteSection;
window.closeDeleteSectionModal = closeDeleteSectionModal;
window.executeSectionDelete = executeSectionDelete;

window.openSpreadsheetView = openSpreadsheetView;

window.populateEventForm = populateEventForm;
window.deleteEvent = deleteEvent;
window.closeDeleteEventModal = closeDeleteEventModal;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;

window.onpageshow = function(event) {
    if (event.persisted) {
        window.location.reload();
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. RUN GUARD FIRST
    await validateSession();

    // 2. Initialize UI
    setupNavigation();
    setupThemeToggle(); 
    loadMonitoringView();
    
    // 3. Start Session Watchdog
    startSessionCheckInterval();
});