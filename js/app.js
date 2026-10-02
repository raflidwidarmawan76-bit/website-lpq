// ===== CONSTANTS =====
const INCOME_CATEGORIES = ['SPP Santri', 'Infaq', 'Donasi', 'Dana BOS', 'Wakaf', 'Zakat', 'Hibah', 'Pendapatan Lain-lain'];
const EXPENSE_CATEGORIES = ['Gaji Pengajar', 'Gaji Staff', 'Listrik & Air', 'ATK & Perlengkapan', 'Kegiatan Belajar', 'Pemeliharaan Gedung', 'Konsumsi', 'Transportasi', 'Kegiatan Keagamaan', 'Pengeluaran Lain-lain'];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const ITEMS_PER_PAGE = 10;

// ===== STORAGE HELPERS =====
function getData(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error('Error parsing data from localStorage:', e);
        return null;
    }
}

function setData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving data to localStorage:', e);
    }
}

// ===== INITIALIZATION =====
function initApp() {
    // Set copyright years
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.copyright-year').forEach(el => el.textContent = currentYear);
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) currentYearEl.textContent = currentYear;

    // Initialize default access code if not exists
    if (!localStorage.getItem('lpq_access_code') || localStorage.getItem('lpq_access_code') === 'LPQBM2024') {
        localStorage.setItem('lpq_access_code', 'LPQBM2026');
    }

    // Set default theme
    const settings = getData('lpq_settings') || { theme: 'light' };
    setTheme(settings.theme);

    // Initialize empty arrays if they don't exist
    if (!getData('lpq_users')) setData('lpq_users', []);
    if (!getData('lpq_transactions')) setData('lpq_transactions', []);
    if (!getData('lpq_budgets')) setData('lpq_budgets', []);
    if (!getData('lpq_activity_logs')) setData('lpq_activity_logs', []);

    // Check for current user session
    const currentUser = getData('lpq_current_user');
    if (currentUser) {
        showPage('main-app');
        updateSidebarUserInfo();
        loadDashboard();
        navigateTo('dashboard');
    } else {
        showPage('guest-page');
    }

    // Hide loading screen after 1.5 seconds
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 300);
        }, 1500);
    }

    // Setup scroll animations (Intersection Observer)
    setupScrollAnimations();

    // Setup keyboard shortcuts (CTRL+SHIFT+A for admin)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (typeof toggleAdminPanel === 'function') {
                toggleAdminPanel();
            }
        }
    });

    // Set current date on topbar
    const topbarDate = document.getElementById('topbar-date');
    if (topbarDate) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        topbarDate.textContent = now.toLocaleDateString('id-ID', options);
    }
}

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    const pages = ['guest-page', 'auth-page', 'main-app'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === pageId) {
                el.style.display = 'block';
                setTimeout(() => el.style.opacity = '1', 50);
            } else {
                el.style.opacity = '0';
                setTimeout(() => el.style.display = 'none', 300);
            }
        }
    });
}

function navigateTo(pageName) {
    document.querySelectorAll('.content-page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });

    const targetPage = document.getElementById('page-' + pageName);
    if (targetPage) {
        targetPage.style.display = 'block';
        setTimeout(() => targetPage.classList.add('active'), 10);
    }

    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = link.textContent.trim();
        }
    });

    if (pageName === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
    if (pageName === 'transactions' && typeof loadTransactionsPage === 'function') loadTransactionsPage();
    if (pageName === 'budget' && typeof loadBudgetPage === 'function') loadBudgetPage();
    if (pageName === 'reports' && typeof loadReportsPage === 'function') loadReportsPage();
    if (pageName === 'settings' && typeof loadSettingsPage === 'function') loadSettingsPage();

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
}

// ===== UI HELPERS =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth <= 992) {
        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    } else {
        if (sidebar) sidebar.classList.toggle('collapsed');
        if (mainContent) mainContent.classList.toggle('expanded');
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function formatCurrency(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== MODAL =====
function openModal(title, bodyHTML) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHTML;
    
    if (overlay) {
        overlay.style.display = 'flex';
        // Add a tiny delay to allow display:flex to apply before transition
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300); // match CSS transition duration
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    if (type === 'warning') icon = 'fas fa-exclamation-triangle';

    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;

    toast.style.padding = '12px 20px';
    toast.style.margin = '10px';
    toast.style.borderRadius = '5px';
    toast.style.color = '#fff';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.animation = 'slideInRight 0.3s ease-in-out forwards';
    toast.style.backgroundColor = type === 'success' ? '#2e7d32' : (type === 'error' ? '#d32f2f' : (type === 'warning' ? '#f59e0b' : '#1976d2'));

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in-out forwards';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ===== SCROLL ANIMATIONS =====
function setupScrollAnimations() {
    if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }
}

// ===== THEME =====
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setData('lpq_settings', { theme });
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });

    if (typeof updateDashboardCharts === 'function' && window.myCharts) {
        updateDashboardCharts();
    }
}

// ===== ACTIVITY LOG =====
function logActivity(action, detail) {
    const logs = getData('lpq_activity_logs') || [];
    const user = getData('lpq_current_user') || { id: 'system', fullName: 'System' };
    
    logs.unshift({
        id: generateId(),
        userId: user.id,
        userName: user.fullName,
        action,
        detail,
        timestamp: new Date().toISOString()
    });
    
    if (logs.length > 100) logs.length = 100;
    setData('lpq_activity_logs', logs);
    
    // FIREBASE SYNC
    if (window.db) {
        window.db.collection('logs').doc(logs[0].id).set(logs[0]).catch(console.error);
    }
}

// ===== DATA BACKUP/RESTORE =====
function exportAllData() {
    const data = {
        users: getData('lpq_users'),
        transactions: getData('lpq_transactions'),
        budgets: getData('lpq_budgets'),
        settings: getData('lpq_settings'),
        logs: getData('lpq_activity_logs')
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_keuangan_lpq_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    logActivity('export', 'Mengekspor seluruh data sistem');
    showToast('Data berhasil diekspor!');
}

function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.users) setData('lpq_users', data.users);
            if (data.transactions) setData('lpq_transactions', data.transactions);
            if (data.budgets) setData('lpq_budgets', data.budgets);
            if (data.settings) setData('lpq_settings', data.settings);
            if (data.logs) setData('lpq_activity_logs', data.logs);
            
            // FIREBASE SYNC BATCH UPLOAD
            if (window.db) {
                const batch = window.db.batch();
                if (data.users) data.users.forEach(item => batch.set(window.db.collection('users').doc(item.id), item));
                if (data.transactions) data.transactions.forEach(item => batch.set(window.db.collection('transactions').doc(item.id), item));
                if (data.budgets) data.budgets.forEach(item => batch.set(window.db.collection('budgets').doc(item.id), item));
                if (data.logs) data.logs.forEach(item => batch.set(window.db.collection('logs').doc(item.id), item));
                batch.commit().catch(console.error);
            }
            
            logActivity('import', 'Mengimpor data sistem dari file');
            showToast('Data berhasil diimpor! Memuat ulang...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Error importing data:', error);
            showToast('Format file tidak valid!', 'error');
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', initApp);




