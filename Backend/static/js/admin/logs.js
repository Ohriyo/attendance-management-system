import { api } from './api.js';

export async function loadAuditLogs() {
    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-brand-muted animate-pulse">Loading activity feed...</td></tr>';

    try {
        const response = await api.getLogs();
        const logs = await response.json();
        
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-brand-muted">No activity recorded yet.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors';
            
            // Format Date
            const dateObj = new Date(log.timestamp);
            const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Color Code Actions
            let badgeColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'; // Default
            if (log.action.includes('DELETE') || log.action.includes('FLUSH')) badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            if (log.action.includes('UPDATE') || log.action.includes('EDIT')) badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            if (log.action.includes('CREATE') || log.action.includes('IMPORT')) badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';

            tr.innerHTML = `
                <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">${dateStr}</td>
                <td class="px-6 py-3 font-semibold text-brand-dark dark:text-white">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs">
                            ${log.actor_username.charAt(0).toUpperCase()}
                        </div>
                        ${log.actor_username}
                    </div>
                </td>
                <td class="px-6 py-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-transparent ${badgeColor}">
                        ${log.action}
                    </span>
                </td>
                <td class="px-6 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title="${log.details}">
                    ${log.details}
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400">Failed to load logs.</td></tr>';
    }
}