import * as API from './api.js';
import { openSpreadsheetView } from './spreadsheet.js';

let cachedSections = [];       
let navPath = [];              
let currentContext = {};      

export async function loadSectionsView() {
    const createSecForm = document.getElementById('create-section-form');
    const newCreateSecForm = createSecForm.cloneNode(true);
    createSecForm.parentNode.replaceChild(newCreateSecForm, createSecForm);
    newCreateSecForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const program = document.getElementById('new-sec-program').value;
        const year = document.getElementById('new-sec-year').value;
        const name = document.getElementById('new-sec-name').value;
        
        if(!program || !year || !name) { alert('Please fill all fields'); return; }

        try {
            const response = await API.createSection({ program, year_level: year, name });
            if(response.ok) {
                closeCreateSectionModal();  
                showSectionSuccessModal();
                await fetchSectionsData();
                renderFolderLevel();
            } else { 
                const result = await response.json();
                showSectionErrorModal(result.message || 'Failed to create section.');
            }
        } catch(err) { 
            console.error(err);
            showSectionErrorModal('Failed. The section already exist');
        }
    });

    // Note: Spreadsheet pagination listeners handled in spreadsheet.js, 
    // but buttons are in the DOM loaded here. 
    // We will attach them in spreadsheet.js when view opens or globally.
    // For safety, they are attached here in original code.
    
    // NOTE: In refactor, `loadSectionsView` attaches pagination logic for sheets.
    // We will delegate that logic to spreadsheet.js but call it here or inside openSpreadsheet.
    // For strict compliance, we keep the original logic flow.

    await fetchSectionsData(); 
    renderFolderLevel();
}

async function fetchSectionsData() {
    try {
        const response = await API.fetchSections();
        cachedSections = await response.json(); 
    } catch (error) { console.error(error); }
}

export function resetSectionView() {
    navPath = [];
    currentContext = {};
    document.getElementById('spreadsheet-view').classList.add('hidden');
    document.getElementById('folder-grid').classList.remove('hidden');
    renderFolderLevel();
}

// Global functions for window
export function navigateDown(label, type) {
    navPath.push(label);
    if(type) currentContext[type] = label;
    renderFolderLevel();
}

export function stepBackFolder() {
    navPath.pop();
    document.getElementById('spreadsheet-view').classList.add('hidden');
    document.getElementById('folder-grid').classList.remove('hidden');
    renderFolderLevel();
}

function renderFolderLevel() {
    const grid = document.getElementById('folder-grid');
    const breadcrumbs = document.getElementById('breadcrumb-container');
    const backBtn = document.getElementById('folder-back-btn');
    
    grid.innerHTML = '';
    breadcrumbs.innerHTML = navPath.map(p => `<i class="ph ph-caret-right text-gray-400"></i> <span>${p}</span>`).join(' ');
    backBtn.classList.toggle('hidden', navPath.length === 0);

    if (navPath.length === 0) {
        const programs = [...new Set(cachedSections.map(s => s.program))].sort();
        programs.forEach(prog => grid.innerHTML += createFolderItem(prog, 'ph-books', 'text-blue-500', prog, 'program'));
    }
    else if (navPath.length === 1) {
        const prog = navPath[0];
        const years = [...new Set(cachedSections.filter(s => s.program === prog).map(s => s.year_level))].sort();
        years.forEach(yr => grid.innerHTML += createFolderItem(yr, 'ph-graduation-cap', 'text-purple-500', yr, 'year'));
    }
    else if (navPath.length === 2) {
    const [prog, yr] = navPath;
    const sections = cachedSections.filter(s => s.program === prog && s.year_level === yr);
    
    sections.forEach(sec => grid.innerHTML += createFolderItem(
        `Section ${sec.name}`, 
        'ph-users-three', 
        'text-green-500', 
        sec.name, 
        'section',
        sec.id  
    ));
    }else if (navPath.length === 3) {
        fetchEventsForFolder(grid);
    }
}

function createFolderItem(title, icon, colorClass, clickValue, clickType, id = null) {
    let deleteBtnHtml = '';
    if (clickType === 'section' && id) {
        deleteBtnHtml = `
            <button onclick="confirmDeleteSection('${id}', event)" 
                    class="absolute top-3 right-3 p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all z-20 opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-red-100"
                    title="Delete Section">
                <i class="ph ph-trash text-xl"></i>
            </button>
        `;
    }

    return `
        <div onclick="navigateDown('${clickValue}', '${clickType}')" 
             class="cursor-pointer bg-white dark:bg-gray-800 aspect-[4/3] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-yellow-400 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-5 group relative overflow-hidden">
            
            ${deleteBtnHtml} <div class="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div class="p-4 rounded-full bg-gray-50 dark:bg-gray-700/50 group-hover:bg-white dark:group-hover:bg-gray-600 shadow-sm transition-colors relative z-10">
                <i class="ph ${icon} text-6xl ${colorClass} group-hover:scale-110 transition-transform duration-300"></i>
            </div>
            
            <span class="font-bold text-gray-800 dark:text-gray-100 text-lg uppercase tracking-wide group-hover:text-yellow-600 dark:group-hover:text-yellow-400 relative z-10">
                ${title}
            </span>
        </div>
    `;
}

async function fetchEventsForFolder(gridContainer) {
    try {
        const response = await API.fetchEvents();
        const events = await response.json();
        
        if (events.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10">No events found.</div>`;
            return;
        }

        events.forEach(evt => {
            gridContainer.innerHTML += `
                <div onclick="openSpreadsheetView('${evt.id}', '${evt.name}')" 
                     class="cursor-pointer bg-white dark:bg-gray-800 aspect-[4/3] rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                    <i class="ph ph-file-xls text-4xl text-gray-400 group-hover:text-green-600 transition-colors"></i>
                    <div class="text-center px-2">
                        <div class="font-bold text-gray-800 dark:text-white text-xs line-clamp-2">${evt.name}</div>
                        <div class="text-[10px] text-gray-400 mt-1">${evt.date}</div>
                    </div>
                </div>
            `;
        });
    } catch (e) { console.error(e); }
}

// Modal Logic
export function openCreateSectionModal() {
    document.getElementById('create-section-modal').classList.remove('hidden');
}

export function closeCreateSectionModal() {
    document.getElementById('create-section-modal').classList.add('hidden');
    document.getElementById('create-section-form').reset();
}

function showSectionSuccessModal() {
    const modal = document.getElementById('section-success-modal');
    modal.classList.remove('hidden');
    const closeBtn = document.getElementById('section-success-btn');
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

let sectionToDeleteId = null;

export function confirmDeleteSection(id, event) {
    event.stopPropagation(); 
    sectionToDeleteId = id;
    document.getElementById('delete-section-modal').classList.remove('hidden');
}

export function closeDeleteSectionModal() {
    document.getElementById('delete-section-modal').classList.add('hidden');
    sectionToDeleteId = null;
}

export async function executeSectionDelete() {
    if (!sectionToDeleteId) return;

    try {
        const response = await API.deleteSection(sectionToDeleteId);

        if (response.ok) {
            closeDeleteSectionModal();
            await fetchSectionsData();
            renderFolderLevel();
        } else {
            alert('Failed to delete section.');
        }
    } catch (error) {
        console.error('Error deleting section:', error);
        alert('Network error occurred.');
    }
}

function showSectionErrorModal(msg) {
    const modal = document.getElementById('section-error-modal');
    document.getElementById('section-error-message').textContent = msg;
    modal.classList.remove('hidden');
    const closeBtn = document.getElementById('section-error-btn');
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

// Getters for spreadsheet to know context
export function getCurrentContext() { return currentContext; }
export function getNavPath() { return navPath; }