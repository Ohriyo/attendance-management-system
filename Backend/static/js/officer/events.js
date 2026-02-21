import * as API from './api.js';
import { API_BASE_URL } from './config.js';
import { loadMonitoringView } from './monitoring.js';

let cachedEvents = []; 
let currentEditingEventId = null;
let eventIdToDelete = null;

export function loadEventsView() {
    const form = document.getElementById('event-form');
    form.replaceWith(form.cloneNode(true)); 
    document.getElementById('event-form').addEventListener('submit', handleEventFormSubmit);

    resetEventForm();
    const filterDropdown = document.getElementById('event-list-filter');
    filterDropdown.replaceWith(filterDropdown.cloneNode(true)); // Reset listener
    document.getElementById('event-list-filter').addEventListener('change', fetchAndRenderEvents);

    // Delete Button Listener
    const deleteExecBtn = document.getElementById('execute-delete-event-btn');
    const newDeleteExecBtn = deleteExecBtn.cloneNode(true);
    deleteExecBtn.replaceWith(newDeleteExecBtn);
    newDeleteExecBtn.addEventListener('click', executeEventDelete);

    fetchAndRenderEvents();
}

export function resetEventForm() {
    document.getElementById('event-form').reset();
    document.getElementById('event-form-submit-btn').textContent = 'Create New Event';
    document.getElementById('event-form-title').textContent = 'Create New Event';
    currentEditingEventId = null;
}

export async function fetchAndRenderEvents() {
    const tableBody = document.getElementById('events-table-body');
    tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic"><i class="ph ph-spinner animate-spin text-2xl mb-2"></i><br>Loading events...</td></tr>';
    
    try {
        const response = await API.fetchEvents();
        cachedEvents = await response.json();
        renderEventsTable(cachedEvents);
    } catch (error) {
        console.error('Error fetching events:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-sm text-red-500 dark:text-red-400 text-center">Failed to load events.</td></tr>';
    }
}

function renderEventsTable(events) {
    const tableBody = document.getElementById('events-table-body');
    const filterType = document.getElementById('event-list-filter').value;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    tableBody.innerHTML = ''; 

    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        if (filterType === 'upcoming') return eventDate >= today; 
        if (filterType === 'past') return eventDate < today;  
        return true; 
    });

    if (filteredEvents.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">No events found.</td></tr>`;
        return;
    }

    filteredEvents.forEach(event => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150';
        
        const dateObj = new Date(event.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isToday = dateObj.getTime() === today.getTime();

        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-center font-mono text-gray-500 dark:text-gray-400">#${event.id}</td>
            <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white text-base">
                ${event.name}
                ${isToday ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 ml-2">TODAY</span>` : ''}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">${formattedDate}</td>
            <td class="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                <button onclick="populateEventForm(this)" 
                        data-id="${event.id}" data-name="${event.name}" data-date="${event.date}"
                        class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100 transition shadow-sm border border-indigo-200">
                    Edit
                </button>
                <button onclick="deleteEvent('${event.id}')" 
                        class="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition shadow-sm border border-red-200">
                    Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Global window functions
export function populateEventForm(button) {
    currentEditingEventId = parseInt(button.getAttribute('data-id'));
    const name = button.getAttribute('data-name');
    const date = button.getAttribute('data-date');

    document.getElementById('event-name').value = name;
    document.getElementById('event-date').value = date;
    document.getElementById('event-form-submit-btn').innerHTML = '<i class="ph ph-floppy-disk text-lg"></i> <span>Update Event</span>';
    document.getElementById('event-form-title').textContent = 'Edit Event';
    document.getElementById('create-event-modal').classList.remove('hidden');
}

export async function handleEventFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('event-name').value.trim();
    const date = document.getElementById('event-date').value;
    const submitBtn = document.getElementById('event-form-submit-btn');
    
    if (!name || !date) { alert('Please fill out all required fields.'); return; }
    
    submitBtn.disabled = true;
    submitBtn.textContent = currentEditingEventId ? 'Updating...' : 'Creating...';

    const method = currentEditingEventId ? 'PUT' : 'POST';
    const url = currentEditingEventId ? `${API_BASE_URL}/events/${currentEditingEventId}` : `${API_BASE_URL}/events`;
    
    try {
        const response = await API.saveEvent(url, method, { name, date });
        const result = await response.json();

        if (response.ok) {
            showEventModal(result.message); 
            closeEventModal(); 
            fetchAndRenderEvents(); 
            loadMonitoringView(); 
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) { console.error(error); } 
    finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentEditingEventId ? 'Update Event' : 'Create New Event';
    }
}

export function deleteEvent(eventId) {
    eventIdToDelete = eventId;
    const modal = document.getElementById('delete-event-modal');
    modal.classList.remove('hidden');
}

export function closeDeleteEventModal() {
    document.getElementById('delete-event-modal').classList.add('hidden');
    eventIdToDelete = null;
}

export async function executeEventDelete() {
    if (!eventIdToDelete) return;

    const btn = document.getElementById('execute-delete-event-btn');
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Deleting...';

        const response = await API.deleteEvent(eventIdToDelete);

        if (response.ok) {
            closeDeleteEventModal();
            fetchAndRenderEvents(); // Refresh table
            loadMonitoringView();   // Refresh dropdown
        } else {
            const result = await response.json();
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Delete error:', error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Modal Helpers
export function showEventModal(message) {
    const modal = document.getElementById('event-success-modal');
    document.getElementById('event-modal-message').textContent = message;
    modal.classList.remove('hidden');
    
    const closeBtn = document.getElementById('event-modal-close-btn');
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.addEventListener('click', () => modal.classList.add('hidden'));
}

export function openEventModal() {
    resetEventForm(); 
    document.getElementById('create-event-modal').classList.remove('hidden');
}

export function closeEventModal() {
    document.getElementById('create-event-modal').classList.add('hidden');
    resetEventForm();
}