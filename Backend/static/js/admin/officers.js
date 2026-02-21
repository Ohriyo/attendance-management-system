import { api } from './api.js';
import { showAlert, showConfirm } from './ui.js';

export async function loadOfficerList() {
    const tbody = document.getElementById('officers-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-brand-muted dark:text-gray-500 animate-pulse">Loading records...</td></tr>';

    try {
        const response = await api.getOfficers();
        if (!response.ok) throw new Error('Failed to fetch officers');

        const officers = await response.json();
        tbody.innerHTML = '';

        if (officers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-brand-muted dark:text-gray-500">No officers found in the system.</td></tr>';
            return;
        }

        officers.forEach(officer => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors';
            
            const roleBadge = officer.role === 'admin' 
                ? '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Admin</span>'
                : '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">Officer</span>';

            const isActive = officer.is_active !== 0; 
            const statusText = isActive ? '<span class="text-green-600 text-xs">● Active</span>' : '<span class="text-red-500 text-xs">● Suspended</span>';

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <i class="ph ph-user text-xl text-gray-500 dark:text-gray-300"></i>
                        </div>
                        <div>
                            <span class="font-semibold text-brand-dark dark:text-white block">${officer.username}</span>
                            ${statusText}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">${roleBadge}</td>
                <td class="px-6 py-4 text-center flex justify-center gap-2">
                    <button onclick="openEditModal('${officer.username}', '${officer.role}', ${isActive})" 
                            class="group p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Edit User">
                        <i class="ph ph-pencil-simple text-xl"></i>
                    </button>
                    ${officer.username !== 'admin' ? `
                    <button class="group p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Delete User" onclick="deleteOfficer('${officer.username}')">
                        <i class="ph ph-trash text-xl transition-transform group-hover:scale-110"></i>
                    </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl">Connection Error: Could not load officer list.</td></tr>`;
    }
}

export async function deleteOfficer(username) {
    showConfirm(
        'Delete Officer?', 
        `Are you sure you want to permanently remove user: ${username}?`, 
        async () => {
            console.log("Delete request sent for:", username); 
            showAlert('Action Pending', `Delete request sent for ${username}. (Backend integration required)`, 'warning');
        }
    );
}

// Form Handlers
export function setupCreateOfficerForm() {
    const createOfficerForm = document.getElementById('create-officer-form');
    if (createOfficerForm) {
        createOfficerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('new-username');
            const passwordInput = document.getElementById('new-password');
            const roleInput = document.getElementById('new-role');

            [usernameInput, passwordInput].forEach(input => input.classList.remove('border-red-500'));

            if (!usernameInput.value.trim()) { usernameInput.classList.add('border-red-500'); return; }
            if (!passwordInput.value) { passwordInput.classList.add('border-red-500'); return; }

            const userData = {
                username: usernameInput.value.trim(),
                password: passwordInput.value,
                role: roleInput.value
            };

            const submitBtn = createOfficerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg leading-none mr-2"></i> Creating...';

            try {
                const response = await api.createOfficer(userData);
                const result = await response.json();

                if (response.ok) {
                    showAlert('Account Created', 'The new officer account has been successfully registered.', 'success');
                    createOfficerForm.reset();
                    loadOfficerList(); 
                } else {
                    showAlert('Creation Failed', result.message, 'error');
                }
            } catch (error) {
                console.error('Error creating officer:', error);
                showAlert('Network Error', 'Connection failed. Please check your internet.', 'error');
            } finally {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}

// Edit Modal
export function openEditModal(username, role, isActive) {
    document.getElementById('edit-original-username').value = username;
    document.getElementById('edit-username').value = username;
    document.getElementById('edit-role').value = role;
    document.getElementById('edit-status').value = isActive ? "true" : "false";
    document.getElementById('edit-password').value = ''; 
    document.getElementById('edit-modal').classList.remove('hidden');
}

export function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

export async function saveOfficerChanges() {
    const originalUsername = document.getElementById('edit-original-username').value;
    const role = document.getElementById('edit-role').value;
    const isActiveStr = document.getElementById('edit-status').value;
    const password = document.getElementById('edit-password').value;
    
    const isActive = (isActiveStr === "true");

    const payload = { role: role, is_active: isActive };
    if (password.trim() !== "") payload.password = password;

    try {
        const response = await api.updateOfficer(originalUsername, payload);
        const result = await response.json();

        if (response.ok) {
            closeEditModal();
            showAlert('Changes Saved', 'Officer details updated successfully.', 'success');
            loadOfficerList(); 
        } else {
            showAlert('Update Failed', result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating officer:', error);
        showAlert('Network Error', 'Could not save changes.', 'error');
    }
}