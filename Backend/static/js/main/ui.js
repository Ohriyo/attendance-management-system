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
    if (elements.html.classList.contains('dark')) {
        elements.html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        elements.html.classList.add('dark');
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
        elements.attendanceListBody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-sm text-gray-500 text-center">No attendance recorded yet for this event.</td></tr>`;
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
            <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">${record.time_in}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">${record.time_out}</td>
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