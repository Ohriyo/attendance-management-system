import { elements } from './dom.js';

// --- Theme Logic ---
export function initTheme() {
    if (localStorage.getItem('theme') === 'light') {
        elements.html.classList.remove('dark');
    } else {
        elements.html.classList.add('dark'); // Default to dark
    }
}

export function toggleTheme() {
    const htmlEl = document.documentElement;
    
    if (htmlEl.classList.contains('dark')) {
        // Switch TO Light Mode
        htmlEl.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        // Switch TO Dark Mode
        htmlEl.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// --- Status Messages ---
export function displayMessage(text, type = 'info') {
    elements.messageBox.textContent = text;
    elements.messageBox.classList.remove('hidden', 'bg-green-600', 'text-white', 'bg-red-600', 'bg-blue-600');
    
    let classes = '';
    if (type === 'success') {
        classes = 'bg-green-600 text-white';
    } else if (type === 'error') {
        classes = 'bg-red-600 text-white';
    } else if (type === 'info') {
         classes = 'bg-blue-600 text-white';
    }
    elements.messageBox.className = `mt-4 p-3 rounded-lg w-full text-center text-sm transition-opacity duration-300 ${classes}`;
    elements.messageBox.classList.remove('hidden');

    setTimeout(() => {
        elements.messageBox.classList.add('hidden');
    }, 7000);
}

// --- Student Info Display ---
export function renderStudentInfo(student) {
    elements.placeholderInfo.classList.add('hidden');
        
    const middleInitial = student.middle_name ? student.middle_name.charAt(0) + '.' : '';
    elements.studentNameDisplay.textContent = `${student.last_name}, ${student.first_name} ${middleInitial}`;
    
    elements.studentDetailsDiv.innerHTML = `
        <p class="text-lg font-semibold">
            <span class="font-normal text-gray-600 dark:text-gray-400">Program:</span> 
            <span class="font-bold text-indigo-600 dark:text-indigo-400">${student.program}</span>
        </p>
        <p class="text-lg font-semibold">
            <span class="font-normal text-gray-600 dark:text-gray-400">Year:</span> 
            <span class="font-bold text-indigo-600 dark:text-indigo-400">${student.year_level}</span>
        </p>
        <p class="text-lg font-semibold">
            <span class="font-normal text-gray-600 dark:text-gray-400">Section:</span> 
            <span class="font-bold text-indigo-600 dark:text-indigo-400">${student.section}</span>
        </p>
    `;
}

export function resetStudentDisplay() {
    elements.studentNameDisplay.textContent = "Welcome, Student!";
    elements.studentDetailsDiv.innerHTML = `<p class="text-lg text-gray-600">Please enter your ID to begin.</p>`;
    elements.placeholderInfo.classList.remove('hidden');
    elements.currentStudentDisplay.textContent = 'Attendance';
}

// --- Attendance Table ---
export function populateAttendanceTable(attendanceRecords) {
    elements.attendanceListBody.innerHTML = ''; // Clear previous data
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
        elements.attendanceListBody.innerHTML = `<tr><td colspan="11" class="px-6 py-4 text-sm text-gray-500 text-center">No attendance recorded yet for this event.</td></tr>`;
        return;
    }

    attendanceRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.classList.add('hover:bg-gray-50', 'dark:hover:bg-gray-800/50', 'transition-colors');
        const recordIndex = attendanceRecords.length - index; 
        
        row.innerHTML = `
            <td class="px-3 py-3 text-center text-sm font-medium text-yellow-600 dark:text-yellow-400">${recordIndex}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-200">${record.student_no}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">${record.last_name}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">${record.first_name}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">${record.middle_name || '-'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400 hidden md:table-cell">${record.program}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-200 hidden md:table-cell">${record.year_level}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-200 hidden lg:table-cell">${record.section}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">${record.date}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">${formatTo12Hour(record.time_in)}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">${formatTo12Hour(record.time_out)}</td>
        `;
        elements.attendanceListBody.appendChild(row);
    });
}

export function updateEventTitle(eventName) {
    elements.attendanceLogTitle.innerHTML = `Live Attendance Log: <span class="text-nwsus-yellow ml-2">${eventName}</span>`;
}

export function setSystemOffline() {
    elements.currentStudentDisplay.textContent = 'System Standby';
    elements.attendanceLogTitle.textContent = 'Live Attendance Log (Offline)';
}

// --- Modal Logic ---
export function openOfficerModal() {
    elements.officerModal.classList.remove('hidden');
    elements.officerModal.classList.add('flex');
}

export function closeOfficerModal() {
    elements.officerModal.classList.add('hidden');
    elements.officerModal.classList.remove('flex');
    elements.officerMessage.textContent = ''; 
    elements.officerLoginForm.reset();
}

export function setOfficerMessage(msg, className) {
    elements.officerMessage.textContent = msg;
    elements.officerMessage.className = className;
}

export function formatTo12Hour(timestampString) {
    if (!timestampString || timestampString === "--:--") return "---";
    const dateObj = new Date(timestampString);

    if (isNaN(dateObj.getTime())) return "---";

    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila' 
    });
}

export function showNotification(message, status = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create the toast element
    const toast = document.createElement('div');
    
    // Base styling: Modern, dark mode supported, rounded corners, subtle shadow
    toast.className = `flex items-center w-full max-w-sm p-4 rounded-2xl shadow-lg border pointer-events-auto transform transition-all duration-300 translate-y-10 opacity-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`;

    // Determine colors and icons based on the status
    let iconHTML = '';
    if (status === 'error' || status === 'warning') {
        // Yellow/Red accent for duplicate scans and errors
        toast.classList.add('border-l-4', 'border-l-yellow-500', 'dark:border-l-yellow-400');
        iconHTML = `<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <i class="ph ph-warning-circle text-xl"></i>
                    </div>`;
    } else if (status === 'in' || status === 'out' || status === 'success') {
        // Green accent for successful scans
        toast.classList.add('border-l-4', 'border-l-green-500', 'dark:border-l-green-400');
        iconHTML = `<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <i class="ph ph-check-circle text-xl"></i>
                    </div>`;
    }

    toast.innerHTML = `
        ${iconHTML}
        <div class="ml-3 text-sm font-semibold text-gray-800 dark:text-white flex-1">
            ${message}
        </div>
        <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white inline-flex items-center justify-center h-8 w-8 transition-colors" onclick="this.parentElement.remove()">
            <span class="sr-only">Close</span>
            <i class="ph ph-x text-lg"></i>
        </button>
    `;

    // Add to container
    container.appendChild(toast);

    // Trigger animation (slide up and fade in)
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-10', 'opacity-0');
        // Wait for animation to finish before removing from DOM
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}