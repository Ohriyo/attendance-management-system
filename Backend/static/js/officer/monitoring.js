import * as API from './api.js';

let currentEventId = 1;

export async function loadMonitoringView() {
    await fetchEventsForDropdown(); 
    const selector = document.getElementById('event-selector');
    if (selector.options.length > 0) {
        currentEventId = parseInt(selector.value);
    }

    await updateMonitoringData(currentEventId);
    selector.removeEventListener('change', handleEventChange);
    selector.addEventListener('change', handleEventChange);
    
    const exportBtn = document.getElementById('export-csv-btn');
    exportBtn.removeEventListener('click', handleCSVExport); 
    exportBtn.addEventListener('click', handleCSVExport);

    checkActiveEventStatus();

    // --- Set Active Event Button Logic ---
    const setActiveBtn = document.getElementById('set-active-btn');
    setActiveBtn.replaceWith(setActiveBtn.cloneNode(true)); 
    document.getElementById('set-active-btn').addEventListener('click', async () => {
        const selector = document.getElementById('event-selector');
        const selectedId = selector.value;
        if(!selectedId) return;

        try {
            const response = await API.setActiveEvent(selectedId);
            if(response.ok) {
                showLiveEventModal(); 
                checkActiveEventStatus(); 
            }
        } catch(e) { console.error(e); }
    });

    // --- NEW: Attendance Mode Toggle Logic (Method 3) ---
    const modeToggleBtn = document.getElementById('attendance-mode-toggle');
    if (modeToggleBtn) {
        // Clear old listeners to prevent duplicates during view swaps
        const newToggleBtn = modeToggleBtn.cloneNode(true);
        modeToggleBtn.parentNode.replaceChild(newToggleBtn, modeToggleBtn);

        newToggleBtn.addEventListener('click', async () => {
            try {
                // 1. Fetch the STRICT system-wide active event
                const activeEventResponse = await API.fetchActiveEvent();
                if (!activeEventResponse.ok) {
                    alert("No active live event set! Please set a live event first before changing modes.");
                    return;
                }
                
                const activeEventData = await activeEventResponse.json();
                const activeEventId = activeEventData.id;
                
                // 2. Determine the current mode from the database state
                const currentMode = activeEventData.attendance_mode || 'IN';
                const newMode = currentMode === 'IN' ? 'OUT' : 'IN';

                // 3. Send update request to the backend
                const updateResponse = await fetch(`/api/events/${activeEventId}/mode`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: newMode })
                });

                if (updateResponse.ok) {
                    // Update UI only on successful database update
                    updateToggleUI(newMode);
                } else {
                    const err = await updateResponse.json();
                    alert(`Failed to change mode: ${err.message}`);
                }
            } catch (error) {
                console.error("Error toggling mode:", error);
            }
        });
    }
}

function handleEventChange(e) {
    currentEventId = parseInt(e.target.value);
    updateMonitoringData(currentEventId);
}

async function fetchEventsForDropdown() {
    try {
        const response = await API.fetchEvents();
        const events = await response.json();
        const selector = document.getElementById('event-selector');
        selector.innerHTML = ''; 

        if (events.length === 0) {
            selector.innerHTML = '<option value="">No Events Available</option>';
            return;
        }

        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.name} (${event.date})`;
            selector.appendChild(option);
        });
        
        selector.value = currentEventId || events[0].id;

    } catch (error) { console.error('Error fetching events:', error); }
}

async function updateMonitoringData(eventId) {
    if (!eventId || isNaN(eventId)) {
        console.warn("Invalid Event ID provided to monitoring.");
        return;
    }
    const loadingText = '...';
    document.getElementById('event-name-display').textContent = 'Loading...';
    document.getElementById('checked-in-count').textContent = loadingText;
    document.getElementById('total-roster-size').textContent = loadingText;
    document.getElementById('attendance-percentage').textContent = loadingText;
    document.getElementById('attendance-table-body').innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500 dark:text-gray-400">Loading attendance data...</td></tr>';
    
    if (!eventId) return;

    try {
        const statsResponse = await API.fetchStats(eventId);
        const stats = await statsResponse.json();

        const logResponse = await API.fetchAttendance(eventId);
        const log = await logResponse.json();
        
        const eventSelector = document.getElementById('event-selector');
        const selectedEventText = eventSelector.options[eventSelector.selectedIndex].textContent;
        document.getElementById('event-name-display').textContent = selectedEventText.split('(')[0].trim();

        if (logResponse.status === 404) {
             updateSummaryCards({ checked_in_count: 0, total_roster_size: 0 }); 
             renderAttendanceTable([]);
             document.getElementById('attendance-table-body').innerHTML = `<tr><td colspan="9" class="p-4 text-center text-red-500 dark:text-red-400">Error: ${log.message}</td></tr>`;
             return;
        }
        updateSummaryCards(stats);
        renderAttendanceTable(log);

    } catch (error) {
        console.error('Error updating monitoring data:', error);
    }
}

function updateSummaryCards(stats) {
    const checkedInCount = stats.checked_in_count || 0;
    const rosterSize = stats.total_roster_size || 0;
    
    let percentage = 0;
    if (rosterSize > 0) percentage = ((checkedInCount / rosterSize) * 100).toFixed(1);
    document.getElementById('checked-in-count').textContent = checkedInCount;
    document.getElementById('total-roster-size').textContent = rosterSize;
    document.getElementById('attendance-percentage').textContent = `${percentage}%`;
    const percentageElement = document.getElementById('attendance-percentage');
    percentageElement.className = "text-3xl font-bold";

    if (percentage >= 75) percentageElement.classList.add('text-green-600', 'dark:text-green-400');
    else if (percentage >= 50) percentageElement.classList.add('text-yellow-600', 'dark:text-yellow-400');
    else if (rosterSize === 0) percentageElement.classList.add('text-gray-900', 'dark:text-white');
    else percentageElement.classList.add('text-red-500', 'dark:text-red-400');
}

function renderAttendanceTable(log) {
    const tableBody = document.getElementById('attendance-table-body');
    tableBody.innerHTML = ''; 

    if (log.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500 dark:text-gray-400">No attendance recorded yet.</td></tr>';
        return;
    }

    log.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150';
        const fullName = `${entry.last_name}, ${entry.first_name} ${entry.middle_name || ''}`;
        
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-center font-medium text-gray-500 dark:text-gray-400">${index + 1}</td>
            <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white">${entry.student_no}</td>
            <td class="px-6 py-4 text-gray-800 dark:text-gray-200">${fullName.trim()}</td>
            <td class="px-6 py-4 text-left hidden md:table-cell text-sm text-gray-600 dark:text-gray-300">${entry.program}</td>
            <td class="px-6 py-4 text-left hidden sm:table-cell text-sm text-gray-600 dark:text-gray-300">${entry.year_level}</td>
            <td class="px-6 py-4 text-left hidden sm:table-cell text-sm text-gray-600 dark:text-gray-300">${entry.section}</td>
            <td class="px-6 py-4 text-left hidden lg:table-cell text-sm text-gray-600 dark:text-gray-300">${entry.date}</td>
            <td class="px-6 py-4 text-sm font-mono text-center text-green-600 dark:text-green-400">${formatTo12Hour(entry.time_in)}</td>
            <td class="px-6 py-4 text-sm font-mono text-center text-red-600 dark:text-red-400">${formatTo12Hour(entry.time_out)}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function handleCSVExport() {
    if (!currentEventId) { alert('Please select an event before exporting.'); return; }
    const exportBtn = document.getElementById('export-csv-btn');
    const originalText = exportBtn.innerHTML;

    try {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl"></i><span> Preparing...</span>';
        const response = await API.exportAttendance(currentEventId);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `attendance_report_${currentEventId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert('Export failed.');
        }
    } catch (error) { console.error('Export error:', error); } 
    finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

async function checkActiveEventStatus() {
    try {
        const response = await API.fetchActiveEvent();
        if(response.ok) {
            const event = await response.json();
            document.getElementById('live-indicator').textContent = event.name;
            
            // NEW: Sync the toggle switch UI with the actual database mode
            if (event.attendance_mode) {
                updateToggleUI(event.attendance_mode);
            } else {
                updateToggleUI('IN'); // Fallback default
            }
        }
    } catch(e) { console.error(e); }
}

function showLiveEventModal() {
    const modal = document.getElementById('live-event-modal');
    modal.classList.remove('hidden');
    const closeBtn = document.getElementById('live-event-modal-close-btn');
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.addEventListener('click', () => modal.classList.add('hidden'));
}

function formatTo12Hour(timestampString) {
    // Catch actual nulls, undefined, empty strings, and the literal word "null"
    if (!timestampString || String(timestampString).trim() === "null") {
        return "---"; 
    }

    const dateObj = new Date(timestampString);
    if (isNaN(dateObj.getTime())) return "---";

    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila' 
    });
}

// --- NEW: UI Update function for the toggle switch ---
function updateToggleUI(mode) {
    const modeToggleBtn = document.getElementById('attendance-mode-toggle');
    const knob = document.getElementById('mode-toggle-knob');
    const labelIn = document.getElementById('label-mode-in');
    const labelOut = document.getElementById('label-mode-out');

    if (!modeToggleBtn || !knob) return; // Safety check

    if (mode === 'OUT') {
        modeToggleBtn.classList.replace('bg-green-500', 'bg-red-500');
        knob.classList.replace('translate-x-0', 'translate-x-5');
        labelIn.classList.replace('text-green-600', 'text-gray-400');
        labelOut.classList.replace('text-gray-400', 'text-red-600');
    } else {
        modeToggleBtn.classList.replace('bg-red-500', 'bg-green-500');
        knob.classList.replace('translate-x-5', 'translate-x-0');
        labelIn.classList.replace('text-gray-400', 'text-green-600');
        labelOut.classList.replace('text-red-600', 'text-gray-400');
    }
}