// Function imports passed from Main to avoid circular deps
import { loadMonitoringView } from './monitoring.js';
import { loadEventsView } from './events.js';
import { loadStudentsView } from './students.js';
import { loadSectionsView } from './sections.js';
import { forceLogout } from './auth.js';

export function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    const themeText = document.getElementById('theme-toggle-text');

    const updateThemeUI = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
            themeText.textContent = "Light Mode";
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
            themeText.textContent = "Dark Mode";
            localStorage.setItem('color-theme', 'light');
        }
    };

    const isDarkMode = localStorage.getItem('color-theme') === 'dark' || 
    (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    updateThemeUI(isDarkMode);
    themeToggleBtn.addEventListener('click', () => {
        const isDarkNow = document.documentElement.classList.contains('dark');
        updateThemeUI(!isDarkNow);
    });
}

export function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a[data-view]'); 
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => {
                l.classList.remove('bg-gray-50', 'dark:bg-gray-700/50', 'text-gray-900', 'dark:text-white');
                l.classList.add('text-gray-600', 'dark:text-gray-300'); 
            });
            
            this.classList.remove('text-gray-600', 'dark:text-gray-300');
            this.classList.add('bg-gray-50', 'dark:bg-gray-700/50', 'text-gray-900', 'dark:text-white');
            const viewId = this.getAttribute('data-view');
            const views = ['monitoring-view', 'events-view', 'students-view', 'sections-view'];
                views.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.classList.add('hidden');
                    }
                });
            document.getElementById(viewId + '-view').classList.remove('hidden');
            
            if (viewId === 'monitoring') loadMonitoringView();
            else if (viewId === 'events') loadEventsView();
            else if (viewId === 'students') loadStudentsView();
            else if (viewId === 'sections') loadSectionsView(); 
        });
    });

    const monitoringLink = document.querySelector('[data-view="monitoring"]');
    if (monitoringLink) monitoringLink.click();

    // UPDATED LOGOUT LOGIC START
    document.getElementById('logout-btn').addEventListener('click', () => {
        document.getElementById('logout-modal').classList.remove('hidden');
    });

    document.getElementById('confirm-logout-btn').addEventListener('click', () => {
        forceLogout();
    });
    // UPDATED LOGOUT LOGIC END
}