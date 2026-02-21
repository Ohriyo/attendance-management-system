import * as API from './api.js';
import { getCurrentContext, getNavPath } from './sections.js';

let currentSheetData = [];
let currentSheetPage = 1;
const SHEET_ITEMS_PER_PAGE = 20;

export async function openSpreadsheetView(eventId, eventName) {
    const currentContext = getCurrentContext();
    const navPath = getNavPath();
    currentContext.eventId = eventId;
    
    document.getElementById('folder-grid').classList.add('hidden');
    document.getElementById('spreadsheet-view').classList.remove('hidden');
    document.getElementById('sheet-title').textContent = `${navPath.join(' > ')} : ${eventName}`;

    // Reset State
    const tbody = document.getElementById('spreadsheet-body');
    tbody.innerHTML = '<tr><td colspan="8" class="p-10 text-center"><i class="ph ph-spinner animate-spin text-2xl"></i><br>Loading Class List...</td></tr>';
    document.getElementById('sheet-count').textContent = 'Loading...';

    // Hook up pagination buttons (idempotent)
    document.getElementById('prev-sheet-btn').onclick = () => {
        if (currentSheetPage > 1) {
            currentSheetPage--;
            renderSheetPagination();
        }
    };
    document.getElementById('next-sheet-btn').onclick = () => {
        const totalPages = Math.ceil(currentSheetData.length / SHEET_ITEMS_PER_PAGE);
        if (currentSheetPage < totalPages) {
            currentSheetPage++;
            renderSheetPagination();
        }
    };

    try {
        // Fetch Data
        const response = await API.fetchSpreadsheet(eventId, currentContext.program, currentContext.year, currentContext.section);
        const data = await response.json();
        
        // SAVE DATA & RESET PAGINATION
        currentSheetData = data; 
        currentSheetPage = 1;
        
        // RENDER FIRST PAGE
        renderSheetPagination();

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="8" class="p-10 text-center text-red-500">Error loading data. Please check connection.</td></tr>';
    }
}

function renderSheetPagination() {
    // 1. Calculate Pagination Logic
    const totalItems = currentSheetData.length;
    const totalPages = Math.ceil(totalItems / SHEET_ITEMS_PER_PAGE);
    
    // Ensure page bounds
    if(currentSheetPage < 1) currentSheetPage = 1;
    if(currentSheetPage > totalPages && totalPages > 0) currentSheetPage = totalPages;

    const startIdx = (currentSheetPage - 1) * SHEET_ITEMS_PER_PAGE;
    const endIdx = startIdx + SHEET_ITEMS_PER_PAGE;
    const pageData = currentSheetData.slice(startIdx, endIdx);

    // 2. Footer Controls
    document.getElementById('sheet-count').textContent = 
        totalItems === 0 
        ? 'No students found' 
        : `Showing ${startIdx + 1}-${Math.min(endIdx, totalItems)} of ${totalItems} students`;
    
    const prevBtn = document.getElementById('prev-sheet-btn');
    const nextBtn = document.getElementById('next-sheet-btn');
    prevBtn.disabled = currentSheetPage === 1;
    nextBtn.disabled = currentSheetPage >= totalPages || totalPages === 0;

    // 3. Render the Rows
    renderSpreadsheetRows(pageData, startIdx);
}

function renderSpreadsheetRows(roster, globalStartIndex) {
    const tbody = document.getElementById('spreadsheet-body');
    tbody.innerHTML = '';

    if (roster.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-10 text-center text-gray-500 italic">No students found in this section.</td></tr>';
        return;
    }

    roster.forEach((row, index) => {
        const actualRowNumber = globalStartIndex + index + 1;

        // 1. Check if any time data exists (is valid and not placeholder)
        const hasTime = (t) => t && t !== '--:--' && String(t).trim() !== '';
        
        const hasAttendance = hasTime(row.am_in) || hasTime(row.am_out) || hasTime(row.pm_in) || hasTime(row.pm_out);

        // 2. Determine Display Status
        let displayStatus = row.status;

        if (!hasAttendance) {
            if (!displayStatus || displayStatus === 'Present' || displayStatus === 'Absent') {
                displayStatus = 'NA';
            }
        } else {
            if (!displayStatus) displayStatus = 'Present';
        }

        // 3. Set Colors based on Status
        let rowClass = "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"; 
        let selectClass = "text-gray-900 dark:text-gray-100"; 

        if (displayStatus === 'NA') {
            rowClass = "bg-gray-50 dark:bg-gray-800/50"; 
            selectClass = "text-gray-400 font-bold";     
        }
        else if (displayStatus === 'Absent') {
            rowClass = "bg-red-50 dark:bg-red-900/20";
            selectClass = "text-red-600 font-bold";
        } 
        else if (displayStatus === 'Excused' || displayStatus === 'Committee') {
            rowClass = "bg-blue-50 dark:bg-blue-900/20";
            selectClass = "text-blue-600 font-bold";
        }
        else if (displayStatus === 'Present') {
             selectClass = "text-green-600 font-bold";
        }

        const inputClass = "w-full h-full bg-transparent text-center outline-none focus:bg-yellow-100 dark:focus:bg-yellow-900/50 transition-colors font-mono text-xs text-gray-700 dark:text-gray-200 py-3";

        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200 dark:border-gray-700 transition duration-150 ${rowClass} group`;
        tr.innerHTML = `
            <td class="border-r border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 font-medium">${actualRowNumber}</td>
            <td class="border-r border-gray-200 dark:border-gray-700 px-3 py-1 font-bold text-gray-800 dark:text-gray-100 uppercase text-xs">${row.last_name}</td>
            <td class="border-r border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-300 uppercase text-xs">${row.first_name}</td>
            <td class="border-r border-gray-200 dark:border-gray-700 p-0"><input type="text" value="${row.am_in || ''}" class="${inputClass}" placeholder="--:--" onchange="saveCell('${row.student_no}', 'am_in', this.value)"></td>
            <td class="border-r border-gray-200 dark:border-gray-700 p-0"><input type="text" value="${row.am_out || ''}" class="${inputClass}" placeholder="--:--" onchange="saveCell('${row.student_no}', 'am_out', this.value)"></td>
            <td class="border-r border-gray-200 dark:border-gray-700 p-0"><input type="text" value="${row.pm_in || ''}" class="${inputClass}" placeholder="--:--" onchange="saveCell('${row.student_no}', 'pm_in', this.value)"></td>
            <td class="border-r border-gray-200 dark:border-gray-700 p-0"><input type="text" value="${row.pm_out || ''}" class="${inputClass}" placeholder="--:--" onchange="saveCell('${row.student_no}', 'pm_out', this.value)"></td>
            <td class="p-0 relative">
                <select onchange="saveCell('${row.student_no}', 'status', this.value); refreshRowColor(this);" 
                        class="w-full h-full bg-transparent text-center outline-none cursor-pointer text-xs uppercase appearance-none py-3 z-10 relative ${selectClass}">
                    <option class="text-gray-400" value="NA" ${displayStatus === 'NA' ? 'selected' : ''}>NA</option>
                    <option class="text-green-600" value="Present" ${displayStatus === 'Present' ? 'selected' : ''}>Present</option>
                    <option class="text-red-600" value="Absent" ${displayStatus === 'Absent' ? 'selected' : ''}>Absent</option>
                    <option class="text-blue-600" value="Excused" ${displayStatus === 'Excused' ? 'selected' : ''}>Excused</option>
                    <option class="text-purple-600" value="Committee" ${displayStatus === 'Committee' ? 'selected' : ''}>Committee</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}