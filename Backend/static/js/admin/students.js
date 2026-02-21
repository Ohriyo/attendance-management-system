import { api } from './api.js';
import { showAlert, showConfirm } from './ui.js';

let allStudents = []; 

export async function loadStudentList() {
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center animate-pulse">Loading roster...</td></tr>';
    
    try {
        const response = await api.getStudents();
        allStudents = await response.json();
        renderStudents(allStudents);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Failed to load roster.</td></tr>';
    }
}

export function renderStudents(students) {
    const tbody = document.getElementById('students-table-body');
    const countLabel = document.getElementById('student-count');
    tbody.innerHTML = '';
    countLabel.textContent = `${students.length} students found`;

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No records found.</td></tr>';
        return;
    }

    // Limit display to 100 for performance
    const displayList = students.slice(0, 100); 

    displayList.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-50 dark:border-gray-700/50';
        tr.innerHTML = `
            <td class="px-6 py-3">
                <input type="checkbox" class="student-select rounded border-gray-300 text-brand-yellow focus:ring-brand-yellow cursor-pointer" value="${s.student_no}">
            </td>
            <td class="px-6 py-3">
                <div>
                    <span class="font-bold text-brand-dark dark:text-white block">${s.last_name}, ${s.first_name} ${s.middle_name || ''}</span>
                    <span class="text-xs text-brand-muted font-mono">${s.student_no}</span>
                </div>
            </td>
            <td class="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">${s.program}</td>
            <td class="px-6 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                    ${s.year_level} - ${s.section}
                </span>
            </td>
            <td class="px-6 py-3 text-center">
                <button onclick="openStudentEdit('${s.student_no}')" class="p-2 text-gray-400 hover:text-brand-yellow transition" title="Edit Student">
                    <i class="ph ph-pencil-simple text-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Search Logic
export function setupStudentSearch() {
    document.getElementById('student-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allStudents.filter(s => 
            s.last_name.toLowerCase().includes(term) || 
            s.first_name.toLowerCase().includes(term) || 
            s.student_no.includes(term)
        );
        renderStudents(filtered);
    });
}

// Edit Logic
export function openStudentEdit(studentNo) {
    const student = allStudents.find(s => s.student_no === studentNo);
    if (!student) return;

    document.getElementById('edit-student-no-orig').value = student.student_no;
    document.getElementById('edit-student-no').value = student.student_no;
    document.getElementById('edit-student-fname').value = student.first_name;
    document.getElementById('edit-student-mname').value = student.middle_name;
    document.getElementById('edit-student-lname').value = student.last_name;
    document.getElementById('edit-student-prog').value = student.program;
    document.getElementById('edit-student-year').value = student.year_level;
    document.getElementById('edit-student-section').value = student.section;
    document.getElementById('student-edit-modal').classList.remove('hidden');
}

export async function saveStudentChanges() {
    const id = document.getElementById('edit-student-no-orig').value;
    const data = {
        first_name: document.getElementById('edit-student-fname').value,
        middle_name: document.getElementById('edit-student-mname').value,
        last_name: document.getElementById('edit-student-lname').value,
        program: document.getElementById('edit-student-prog').value,
        year_level: document.getElementById('edit-student-year').value,
        section: document.getElementById('edit-student-section').value
    };

    try {
        const res = await api.updateStudent(id, data);
        if (res.ok) {
            showAlert('Success', 'Student details updated!', 'success');
            document.getElementById('student-edit-modal').classList.add('hidden');
            loadStudentList(); 
        } else {
            showAlert('Error', 'Update failed.', 'error');
        }
    } catch(e) { console.error(e); }
}

// Promotions & Demotions
export async function confirmPromotion() {
    showConfirm(
        'Promote All Students?',
        "⚠️ WARNING: This will promote ALL students to the next year level (e.g., 1st -> 2nd). 4th Year students will become Alumni. Proceed?",
        async () => {
            const res = await api.promoteStudents();
            if (res.ok) {
                showAlert('Promotion Complete', 'Students have been moved to the next level.', 'success');
                loadStudentList();
            } else {
                showAlert('Error', 'Error during promotion.', 'error');
            }
        }
    );
}

export async function confirmDemotion() {
    const checkedBoxes = document.querySelectorAll('.student-select:checked');
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    if (selectedIds.length === 0) {
        showAlert('No Selection', 'Please select at least one student to demote.', 'warning');
        return;
    }

    showConfirm(
        'Confirm Demotion', 
        `Are you sure you want to demote the ${selectedIds.length} selected student(s)?\n(e.g., 2nd Year → 1st Year).`, 
        async () => {
            try {
                const response = await api.demoteStudents(selectedIds);
                const result = await response.json();
                if (response.ok) {
                    showAlert('Success', result.message, 'success');
                    loadStudentList();
                    // Reset header checkbox
                    const headerCb = document.getElementById('select-all-students');
                    if(headerCb) headerCb.checked = false;
                } else {
                    showAlert('Error', result.message || 'Demotion failed.', 'error');
                }
            } catch (error) {
                console.error(error);
                showAlert('Network Error', 'Could not connect to server.', 'error');
            }
        }
    );
}

export function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.student-select');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

export function checkDuplicates() {
    // 1. Guard clause in case data hasn't loaded
    if (!allStudents || allStudents.length === 0) {
        showAlert('No Data', 'No student records found to check.', 'warning');
        return;
    }

    try {
        const nameMap = {};
        
        // 2. Map and count occurrences locally
        allStudents.forEach(student => {
            // Normalize strings to prevent case or spacing mismatches (e.g., "Doe " vs "doe")
            const firstName = (student.first_name || '').trim().toLowerCase();
            const lastName = (student.last_name || '').trim().toLowerCase();
            const key = `${lastName}, ${firstName}`;
            
            if (!nameMap[key]) {
                nameMap[key] = { 
                    last_name: student.last_name.trim(), 
                    first_name: student.first_name.trim(), 
                    count: 0 
                };
            }
            nameMap[key].count++;
        });

        // 3. Filter for true duplicates
        const dups = Object.values(nameMap).filter(d => d.count > 1);

        // 4. Render the appropriate UI alert
        if (dups.length === 0) {
            showAlert('No Duplicates', "Great news! No duplicate names found in the database.", 'success');
        } else {
            const names = dups.map(d => `• ${d.last_name}, ${d.first_name} (${d.count}x)`).join('\n');
            showAlert('Potential Duplicates Found', `Found ${dups.length} issues:\n${names}`, 'warning');
        }
        
    } catch (error) {
        console.error('Duplicate check failed:', error);
        showAlert('Error', 'An unexpected error occurred while scanning for duplicates.', 'error');
    }
}