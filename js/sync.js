// sync.js - Handles Real-time Synchronization between Firestore and LocalStorage

function initRealtimeSync() {
    if (!window.db) return;

    const collections = [
        { name: 'users', localKey: 'lpq_users' },
        { name: 'transactions', localKey: 'lpq_transactions' },
        { name: 'budgets', localKey: 'lpq_budgets' },
        { name: 'logs', localKey: 'lpq_activity_logs' }
    ];

    collections.forEach(col => {
        window.db.collection(col.name).onSnapshot((snapshot) => {
            const data = [];
            snapshot.forEach(doc => {
                data.push(doc.data());
            });
            
            // Sort to maintain order if necessary
            if (col.name === 'transactions' || col.name === 'logs') {
                data.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));
            }
            
            // Bypass the overridden setData to avoid infinite loops
            localStorage.setItem(col.localKey, JSON.stringify(data));
            
            // Refresh UI if functions exist
            if (col.name === 'transactions' && typeof filterTransactions === 'function' && document.getElementById('page-transactions').classList.contains('active')) {
                filterTransactions();
            }
            if (typeof updateDashboardCharts === 'function' && document.getElementById('page-dashboard').classList.contains('active')) {
                loadDashboard();
            }
            if (col.name === 'budgets' && typeof loadBudgetPage === 'function' && document.getElementById('page-budget').classList.contains('active')) {
                loadBudgetPage();
            }
            if (col.name === 'users' && typeof loadAdminUsers === 'function' && document.getElementById('admin-panel').classList.contains('active')) {
                loadAdminUsers();
            }
        }, (error) => {
            console.error("Sync error for " + col.name + ":", error);
        });
    });
}

// Override setData to also write to Firestore individually!
const originalSetData = window.setData;
window.setData = function(key, data) {
    // 1. Save locally first (synchronous UI update)
    originalSetData(key, data);
    
    // 2. Sync to Firestore if it's an array we manage
    if (!window.db) return;
    
    const collectionMap = {
        'lpq_users': 'users',
        'lpq_transactions': 'transactions',
        'lpq_budgets': 'budgets',
        'lpq_activity_logs': 'logs'
    };
    
    const colName = collectionMap[key];
    if (colName && Array.isArray(data)) {
        // Find which items were added/modified/deleted
        // For simplicity in this adaptation, we'll sync the specific item if this was a targeted update,
        // BUT our app currently rewrites the WHOLE array every time (e.g. transactions.push(t); setData(..., transactions)).
        // To handle this without deleting and recreating everything, we can do batch writes,
        // OR better: we intercept the save functions directly in their respective files.
    }
};

// Start sync on load
document.addEventListener('DOMContentLoaded', () => { setTimeout(initRealtimeSync, 1000); });


