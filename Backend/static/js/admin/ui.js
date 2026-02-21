let confirmCallback = null;

// --- Modal Helpers ---
export function toggleModal(modalId, show) {
    const el = document.getElementById(modalId);
    if (!el) return;
    const inner = el.querySelector('div'); // The inner card

    if (show) {
        el.classList.remove('hidden');
        setTimeout(() => {
            el.classList.remove('opacity-0', 'pointer-events-none');
            inner.classList.remove('scale-95');
            inner.classList.add('scale-100');
        }, 10);
    } else {
        el.classList.add('opacity-0', 'pointer-events-none');
        inner.classList.remove('scale-100');
        inner.classList.add('scale-95');
        setTimeout(() => {
            el.classList.add('hidden');
        }, 300); 
    }
}

export function setupModalHelpers() {
    // 1. Safe check for the status modal
    const statusModal = document.getElementById('status-modal');
    if (statusModal) {
        statusModal.addEventListener('click', (e) => {
            if (e.target.id === 'status-modal') closeStatusModal();
        });
    }
    
    // 2. Safe check for the cancel button
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            toggleModal('confirm-modal', false);
            confirmCallback = null;
        });
    }

    // 3. Safe check for the OK (Logout/Proceed) button
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            toggleModal('confirm-modal', false);
            if (confirmCallback) confirmCallback();
        });
    }
}

export function closeStatusModal() {
    toggleModal('status-modal', false);
}

// --- Alerts ---
export function showAlert(title, message, type = 'success') {
    const titleEl = document.getElementById('status-title');
    const msgEl = document.getElementById('status-message');
    const iconEl = document.getElementById('status-icon');
    const iconBg = document.getElementById('status-icon-bg');

    titleEl.textContent = title;
    msgEl.textContent = message;

    if (type === 'success') {
        iconEl.className = 'ph ph-check-circle text-3xl text-green-600 dark:text-green-400';
        iconBg.className = 'mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 bg-green-100 dark:bg-green-900/30';
    } else if (type === 'error') {
        iconEl.className = 'ph ph-x-circle text-3xl text-red-600 dark:text-red-400';
        iconBg.className = 'mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 bg-red-100 dark:bg-red-900/30';
    } else if (type === 'warning') {
        iconEl.className = 'ph ph-warning text-3xl text-yellow-600 dark:text-yellow-400';
        iconBg.className = 'mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 bg-yellow-100 dark:bg-yellow-900/30';
    }

    toggleModal('status-modal', true);
}

export function showConfirm(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = callback;
    toggleModal('confirm-modal', true);
}

// --- Theme ---
export function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    const root = document.documentElement;

    const updateThemeUI = (isDark) => {
        if (isDark) {
            root.classList.add('dark');
            themeIcon.classList.replace('ph-moon', 'ph-sun');
            themeText.textContent = 'Light Mode';
        } else {
            root.classList.remove('dark');
            themeIcon.classList.replace('ph-sun', 'ph-moon');
            themeText.textContent = 'Dark Mode';
        }
    };

    updateThemeUI(root.classList.contains('dark'));

    themeToggleBtn.addEventListener('click', () => {
        const isDark = !root.classList.contains('dark');
        localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
        updateThemeUI(isDark);
    });
}