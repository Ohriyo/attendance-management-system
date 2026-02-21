import * as API from './api.js';
import { API_BASE_URL } from './config.js';

let cachedStudents = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let currentSort = { field: 'last_name', direction: 'asc' };
let currentEditingStudentId = null;
let currentDeleteId = null; // Internal module state

export function loadStudentsView() {
    const form = document.getElementById('student-form');
    
    // --- 1. SETUP DELETE MODAL BUTTONS ---
    const confirmBtn = document.getElementById('confirm-delete-student-btn');
    const cancelBtn = document.getElementById('cancel-delete-student-btn');

    // Clone buttons to remove any old/duplicate event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Attach the Global functions
    newConfirmBtn.addEventListener('click', executeStudentDelete);
    newCancelBtn.addEventListener('click', closeDeleteStudentModal);
    // -------------------------------------

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('submit', handleStudentSubmit);

    const closeBtn = document.getElementById('success-modal-close-btn');
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn); 
    newCloseBtn.addEventListener('click', () => {
        document.getElementById('success-modal').classList.add('hidden');
    });

   const sectionFilter = document.getElementById('roster-filter-section');

    // Trigger update whenever Program changes
    document.getElementById('roster-filter-program').addEventListener('change', () => { 
        currentPage = 1; 
        updateSectionDropdown(); // Fetch new sections
        filterAndRenderStudents(); 
    });

    // Trigger update whenever Year Level changes
    document.getElementById('roster-filter-year').addEventListener('change', () => { 
        currentPage = 1; 
        updateSectionDropdown(); // Fetch new sections
        filterAndRenderStudents(); 
    });

    // Re-render table when Section itself changes
    sectionFilter.addEventListener('change', () => { 
        currentPage = 1; 
        filterAndRenderStudents(); 
    });

    document.getElementById('prev-page-btn').onclick = () => { if (currentPage > 1) { currentPage--; filterAndRenderStudents(); } };

    document.getElementById('next-page-btn').onclick = () => { currentPage++; filterAndRenderStudents(); };
    
    fetchAndRenderStudents();
    updateSectionDropdown();
}

// Global window functions needed for onclicks
export function sortRoster(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    filterAndRenderStudents();
}

export function editStudent(studentNo) {
    const student = cachedStudents.find(s => s.student_no === studentNo);
    if (!student) return;

    currentEditingStudentId = studentNo;

    // Populate Modal Fields
    document.getElementById('student-no').value = student.student_no;
    document.getElementById('student-no').disabled = true; // Disable ID editing
    document.getElementById('last-name').value = student.last_name;
    document.getElementById('first-name').value = student.first_name;
    document.getElementById('middle-name').value = student.middle_name || '';
    document.getElementById('program').value = student.program;
    document.getElementById('year-level').value = student.year_level;
    document.getElementById('section').value = student.section;
    
    // Update Modal UI for Edit Mode
    document.getElementById('student-modal-title').textContent = 'Edit Student Details';
    const submitBtn = document.getElementById('student-form-submit-btn');
    submitBtn.innerHTML = '<i class="ph ph-floppy-disk mr-2"></i> Update Student';
    
    // Show Modal
    document.getElementById('student-modal').classList.remove('hidden');
}

export function resetStudentForm() {
    document.getElementById('student-form').reset();
    document.getElementById('student-no').disabled = false;
    currentEditingStudentId = null;
}

// Modal Toggles
export function openStudentModal() {
    resetStudentForm(); // Clear fields first
    document.getElementById('student-modal-title').textContent = 'Add New Student';
    document.getElementById('student-form-submit-btn').innerHTML = '<i class="ph ph-plus-circle mr-2"></i> Add Student';
    document.getElementById('student-modal').classList.remove('hidden');
}

export function closeStudentModal() {
    document.getElementById('student-modal').classList.add('hidden');
    resetStudentForm();
}

// Internal logic
async function fetchAndRenderStudents() {
    const tableBody = document.getElementById('students-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-sm text-gray-500 dark:text-gray-500 text-center">Loading roster...</td></tr>';
    try {
        const response = await API.fetchStudents();
        if (!response.ok) throw new Error('Failed to fetch');
        cachedStudents = await response.json();
        filterAndRenderStudents();
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-sm text-red-500 dark:text-red-400 text-center">Error loading data.</td></tr>';
    }
}

function filterAndRenderStudents() {
    const searchTerm = document.getElementById('roster-search').value.toLowerCase();
    const programFilter = document.getElementById('roster-filter-program').value;
    const yearFilter = document.getElementById('roster-filter-year').value;
    const sectionFilter = document.getElementById('roster-filter-section').value; // New

    let filtered = cachedStudents.filter(s => {
        const matchesSearch = s.last_name.toLowerCase().includes(searchTerm) || 
                              s.first_name.toLowerCase().includes(searchTerm) || 
                              s.student_no.toLowerCase().includes(searchTerm);
        const matchesProgram = programFilter === 'All' || s.program === programFilter;
        const matchesYear = yearFilter === 'All' || s.year_level === yearFilter;
        const matchesSection = sectionFilter === 'All' || s.section === sectionFilter; // New
        
        return  matchesProgram && matchesYear && matchesSection;
    });

    filtered.sort((a, b) => {
        let valA = a[currentSort.field].toLowerCase();
        let valB = b[currentSort.field].toLowerCase();
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    const tableBody = document.getElementById('students-table-body');
    tableBody.innerHTML = '';

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400 italic">No matching students found.</td></tr>';
        document.getElementById('roster-count').textContent = 'Showing 0 students';
        return;
    }

    paginatedItems.forEach((s, index) => {
        const realIndex = startIdx + index + 1;
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition duration-150';
        row.innerHTML = `
            <td class="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">${realIndex}</td>
            <td class="px-6 py-4 text-gray-900 dark:text-white font-mono text-sm">${s.student_no}</td>
    
            <td class="px-6 py-4 text-gray-800 dark:text-gray-200 text-sm font-semibold">${s.last_name}, ${s.first_name}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">${s.program}</span>
            </td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">${s.year_level}</td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">${s.section}</td>
            <td class="px-6 py-4 text-center space-x-2">
                <button onclick="editStudent('${s.student_no}')" class="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30" title="Edit Student">
                    <i class="ph ph-pencil-simple text-lg"></i>
                </button>
                <button onclick="deleteStudent('${s.student_no}')" class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete Student">
                    <i class="ph ph-trash text-lg"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('roster-count').textContent = `Showing ${startIdx + 1}-${Math.min(startIdx + ITEMS_PER_PAGE, totalItems)} of ${totalItems} students`;
    document.getElementById('prev-page-btn').disabled = currentPage === 1;
    document.getElementById('next-page-btn').disabled = currentPage === totalPages || totalPages === 0;
}

async function updateSectionDropdown() {
    const program = document.getElementById('roster-filter-program').value;
    const year = document.getElementById('roster-filter-year').value;
    const sectionDropdown = document.getElementById('roster-filter-section');
    
    // Reset to default state immediately
    sectionDropdown.innerHTML = '<option value="All">All Sections</option>';

    // If 'All' is selected for either, we show all general sections or stay at 'All'
    try {
        const response = await API.fetchAvailableSections(program, year);
        const availableSections = await response.json();

        if (Array.isArray(availableSections)) {
            // Use a Set to prevent visual duplicates if the database has redundant entries
            const uniqueSections = [...new Set(availableSections)];
            
            uniqueSections.forEach(sec => {
                if(sec) { 
                    const opt = document.createElement('option');
                    opt.value = sec;
                    opt.textContent = `Section ${sec}`;
                    sectionDropdown.appendChild(opt);
                }
            });
        }
    } catch (error) {
        console.error("Error fetching created sections:", error);
    }
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    const studentData = {
        student_no: document.getElementById('student-no').value.trim(),
        last_name: document.getElementById('last-name').value.trim(),
        first_name: document.getElementById('first-name').value.trim(),
        middle_name: document.getElementById('middle-name').value.trim(),
        program: document.getElementById('program').value, 
        year_level: document.getElementById('year-level').value, 
        section: document.getElementById('section').value.trim(),
    };

    if (!studentData.program || !studentData.year_level) {
        alert('Please select a program and year level.');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin"></i> Saving...';
    const isEditing = !!currentEditingStudentId;
    const url = isEditing ? `${API_BASE_URL}/students/${currentEditingStudentId}` : `${API_BASE_URL}/students`;
    const method = isEditing ? 'PUT' : 'POST';

    let success = false;
    try {
        const response = await API.saveStudent(url, method, studentData);
        const result = await response.json();

        if (response.ok) {
            success = true;
            closeStudentModal();
            const modal = document.getElementById('success-modal');
            const msg = document.getElementById('success-modal-message');

            if (isEditing) {
                msg.textContent = `Student ${studentData.first_name} ${studentData.last_name} has been updated.`;
                } else {
                    msg.textContent = `${studentData.first_name} ${studentData.last_name} has been added to the roster.`;
                }
                modal.classList.remove('hidden');
                
                fetchAndRenderStudents();
            } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error saving student:', error);
        alert('Network error. Could not connect to server.');
    } finally {
        submitBtn.disabled = false;
        if (!success) submitBtn.innerHTML = originalBtnText; 
    }
}

// Delete Logic
export function deleteStudent(studentNo) {
    // Save the ID to the module scope so it persists
    currentDeleteId = studentNo;
    
    console.log("Prepared to delete:", currentDeleteId); // Debugging Log

    const modal = document.getElementById('delete-student-modal');
    const message = document.getElementById('delete-student-message');
    
    message.innerHTML = `Are you sure you want to delete student <b>${studentNo}</b>?<br>This will also remove their attendance records.`;
    modal.classList.remove('hidden');
}

export function closeDeleteStudentModal() {
    document.getElementById('delete-student-modal').classList.add('hidden');
    currentDeleteId = null; // Clear the ID
}

export async function executeStudentDelete() {
    // Retrieve ID from module scope
    const idToDelete = currentDeleteId;

    if (!idToDelete) {
        console.error("ERROR: No student ID selected for deletion.");
        return;
    }

    const confirmBtn = document.getElementById('confirm-delete-student-btn');
    const originalText = confirmBtn.innerHTML;
    
    try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Deleting...';

        const response = await API.deleteStudent(idToDelete);
        
        if (response.ok) {
            closeDeleteStudentModal();
            fetchAndRenderStudents();
        } else {
            alert('Failed to delete student.');
        }
    } catch (error) {
        console.error(error);
        alert('Network error.');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}