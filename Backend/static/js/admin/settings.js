import { api } from './api.js';
import { showAlert } from './ui.js';

export async function loadGlobalSettings() {
    try {
        const response = await api.getSettings();
        if (!response.ok) return; 

        const settings = await response.json();
        const setVal = (name, val) => {
            const el = document.querySelector(`[name="${name}"]`);
            if (el && val) el.value = val;
        };

        setVal('academic_year', settings.academic_year);
        setVal('semester', settings.semester);
        setVal('org_name', settings.org_name);
        setVal('absence_fine', settings.absence_fine);

    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

export async function saveGlobalSettings() {
    const btn = document.querySelector('button[onclick="saveGlobalSettings()"]');
    const originalText = btn.innerHTML;
    btn.classList.add('btn-loading');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Saving...';

    const data = {
        academic_year: document.querySelector('[name="academic_year"]').value,
        semester: document.querySelector('[name="semester"]').value,
        org_name: document.querySelector('[name="org_name"]').value,
        absence_fine: document.querySelector('[name="absence_fine"]').value
    };

    try {
        const response = await api.saveSettings(data);
        if (response.ok) {
            showAlert('Configuration Saved', 'System settings have been updated.', 'success');
        } else {
            showAlert('Error', 'Failed to save settings.', 'error');
        }
    } catch (error) {
        console.error(error);
        showAlert('Error', 'Network error occurred.', 'error');
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}