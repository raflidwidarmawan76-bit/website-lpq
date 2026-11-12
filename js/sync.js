// sync.js - Handles Real-time Two-Way Synchronization & Data Protection between Firestore and LocalStorage

let firebasePermissionErrorShown = false;

const ARCHIVED_OCTOBER_TRANSACTIONS = [
    { id: 'rec_oct26_01', date: '2026-10-02', description: 'Ahmad Ubaidillah', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-02T08:00:00.000Z' },
    { id: 'rec_oct26_02', date: '2026-10-02', description: 'Al ghani Zia', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 50000, createdBy: 'system', createdAt: '2026-10-02T08:05:00.000Z' },
    { id: 'rec_oct26_03', date: '2026-10-02', description: 'print berkas bufallo', category: 'ATK & Perlengkapan', type: 'expense', wallet: 'Cash', amount: 7000, createdBy: 'system', createdAt: '2026-10-02T09:00:00.000Z' },
    { id: 'rec_oct26_04', date: '2026-10-02', description: 'print & foto copy mewarnai 250 lembar', category: 'ATK & Perlengkapan', type: 'expense', wallet: 'Cash', amount: 100000, createdBy: 'system', createdAt: '2026-10-02T09:30:00.000Z' },
    { id: 'rec_oct26_05', date: '2026-10-03', description: 'Nadiyatul khoir', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-03T08:00:00.000Z' },
    { id: 'rec_oct26_06', date: '2026-10-03', description: 'M Afka Nur Rachman (oktober - november)', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 80000, createdBy: 'system', createdAt: '2026-10-03T08:10:00.000Z' },
    { id: 'rec_oct26_07', date: '2026-10-03', description: 'Ibrahim Dahlan J (bayar untuk bulan September)', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-03T08:20:00.000Z' },
    { id: 'rec_oct26_08', date: '2026-10-03', description: 'Khenan Odel R (bayar untuk bulan September)', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-03T08:30:00.000Z' },
    { id: 'rec_oct26_09', date: '2026-10-05', description: 'DP Siti Romlah T1', category: 'Pendapatan Lain-lain', type: 'income', wallet: 'Cash', amount: 15000, createdBy: 'system', createdAt: '2026-10-05T08:00:00.000Z' },
    { id: 'rec_oct26_10', date: '2026-10-05', description: 'DP Azam tilawati 3', category: 'Pendapatan Lain-lain', type: 'income', wallet: 'Cash', amount: 15000, createdBy: 'system', createdAt: '2026-10-05T08:05:00.000Z' },
    { id: 'rec_oct26_11', date: '2026-10-06', description: 'Aninda Prilly Ashifa', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-06T08:00:00.000Z' },
    { id: 'rec_oct26_12', date: '2026-10-06', description: 'Adinda Putri D', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-06T08:05:00.000Z' },
    { id: 'rec_oct26_13', date: '2026-10-06', description: 'M dzaka Fauzan', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-06T08:10:00.000Z' },
    { id: 'rec_oct26_14', date: '2026-10-06', description: 'Moh Rokibuddin', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-06T08:15:00.000Z' },
    { id: 'rec_oct26_15', date: '2026-10-06', description: 'Kenzi Rabbani', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-06T08:20:00.000Z' },
    { id: 'rec_oct26_16', date: '2026-10-06', description: 'Aksara Samiet A', category: 'SPP Santri', type: 'income', wallet: 'Cash', amount: 40000, createdBy: 'system', createdAt: '2026-10-06T08:25:00.000Z' }
];

function markItemDeleted(id) {
    if (!id) return;
    try {
        const deleted = JSON.parse(localStorage.getItem('lpq_deleted_ids') || '[]');
        if (!deleted.includes(id)) {
            deleted.push(id);
            if (deleted.length > 500) deleted.shift();
            localStorage.setItem('lpq_deleted_ids', JSON.stringify(deleted));
        }
    } catch (e) {
        console.error('Error marking item deleted:', e);
    }
}

function queuePendingSync(collectionName, action, payload) {
    try {
        const queue = JSON.parse(localStorage.getItem('lpq_pending_sync') || '[]');
        queue.push({
            collection: collectionName,
            action: action,
            payload: payload,
            timestamp: Date.now()
        });
        localStorage.setItem('lpq_pending_sync', JSON.stringify(queue));
    } catch (e) {
        console.error('Error queueing pending sync:', e);
    }
}

function flushPendingSync() {
    if (!window.db) return;
    try {
        const queue = JSON.parse(localStorage.getItem('lpq_pending_sync') || '[]');
        if (queue.length === 0) return;

        const batch = window.db.batch();
        queue.forEach(item => {
            if (!item.collection || !item.payload || !item.payload.id) return;
            const ref = window.db.collection(item.collection).doc(item.payload.id);
            if (item.action === 'delete') {
                batch.delete(ref);
            } else {
                batch.set(ref, item.payload, { merge: true });
            }
        });

        batch.commit().then(() => {
            localStorage.removeItem('lpq_pending_sync');
            console.log('Pending sync queue flushed successfully.');
        }).catch(err => {
            console.warn('Could not flush pending sync queue yet:', err);
        });
    } catch (e) {
        console.error('Error flushing pending sync:', e);
    }
}

function restoreFromLocalBackupIfNeeded() {
    const keys = ['lpq_users', 'lpq_transactions', 'lpq_budgets', 'lpq_activity_logs'];
    keys.forEach(key => {
        const current = getData(key);
        const backup = getData(key + '_backup');
        if ((!current || current.length === 0) && Array.isArray(backup) && backup.length > 0) {
            localStorage.setItem(key, JSON.stringify(backup));
            console.log(`Auto-restored ${backup.length} items for ${key} from local backup.`);
        } else if (Array.isArray(current) && current.length > 0) {
            localStorage.setItem(key + '_backup', JSON.stringify(current));
        }
    });

    // If transactions are still empty and user hasn't manually reset, auto-seed the verified October 2026 records
    const txNow = getData('lpq_transactions') || [];
    const deletedIds = new Set(getData('lpq_deleted_ids') || []);
    if (txNow.length === 0 && localStorage.getItem('lpq_manual_reset') !== 'true') {
        const restored = ARCHIVED_OCTOBER_TRANSACTIONS.filter(t => !deletedIds.has(t.id));
        if (restored.length > 0) {
            localStorage.setItem('lpq_transactions', JSON.stringify(restored));
            localStorage.setItem('lpq_transactions_backup', JSON.stringify(restored));
        }
    }
}

function initRealtimeSync() {
    restoreFromLocalBackupIfNeeded();

    if (!window.db) return;

    flushPendingSync();

    const collections = [
        { name: 'users', localKey: 'lpq_users' },
        { name: 'transactions', localKey: 'lpq_transactions' },
        { name: 'budgets', localKey: 'lpq_budgets' },
        { name: 'logs', localKey: 'lpq_activity_logs' }
    ];

    collections.forEach(col => {
        window.db.collection(col.name).onSnapshot((snapshot) => {
            const remoteData = [];
            snapshot.forEach(doc => {
                const docData = doc.data();
                if (docData && !docData.id) docData.id = doc.id;
                remoteData.push(docData);
            });

            const localData = getData(col.localKey) || [];
            const backupData = getData(col.localKey + '_backup') || [];
            const deletedIds = new Set(getData('lpq_deleted_ids') || []);

            // Smart Two-Way Merge: Never let an empty or partial snapshot wipe valid local data
            const mergedMap = new Map();

            // 1. Add remote items (unless marked deleted locally)
            remoteData.forEach(item => {
                if (!item || !item.id) return;
                if (deletedIds.has(item.id)) {
                    window.db.collection(col.name).doc(item.id).delete().catch(() => {});
                    return;
                }
                mergedMap.set(item.id, item);
            });

            // 2. Preserve local items not yet in remote and push them to Firestore
            const sourceLocal = localData.length > 0 ? localData : backupData;
            const unsyncedLocal = [];

            sourceLocal.forEach(localItem => {
                if (!localItem || !localItem.id || deletedIds.has(localItem.id)) return;
                if (String(localItem.id).startsWith('sample_') && remoteData.length > 0) return;

                // Prevent duplicate if a fallback rec_oct26_ item already exists as a real Firestore document
                if (col.name === 'transactions' && String(localItem.id).startsWith('rec_oct26_') && remoteData.length > 0) {
                    const alreadyInRemote = remoteData.some(r =>
                        !String(r.id).startsWith('rec_oct26_') &&
                        r.date === localItem.date &&
                        (r.description || '').trim().toLowerCase() === (localItem.description || '').trim().toLowerCase() &&
                        Number(r.amount) === Number(localItem.amount)
                    );
                    if (alreadyInRemote) return;
                }

                if (!mergedMap.has(localItem.id)) {
                    mergedMap.set(localItem.id, localItem);
                    unsyncedLocal.push(localItem);
                } else {
                    const remoteItem = mergedMap.get(localItem.id);
                    const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
                    const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
                    if (localTime > remoteTime) {
                        mergedMap.set(localItem.id, localItem);
                        unsyncedLocal.push(localItem);
                    }
                }
            });

            // Push any unsynced local items up to Firestore so cloud is always complete
            if (unsyncedLocal.length > 0) {
                const batch = window.db.batch();
                unsyncedLocal.slice(0, 450).forEach(item => {
                    const ref = window.db.collection(col.name).doc(item.id);
                    batch.set(ref, item, { merge: true });
                });
                batch.commit().catch(err => console.warn(`Auto-push warning for ${col.name}:`, err));
            }

            const mergedData = Array.from(mergedMap.values());

            // Sort to maintain chronological order
            if (col.name === 'transactions' || col.name === 'logs') {
                mergedData.sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
            }

            // Save merged data to localStorage and backup (if non-empty)
            localStorage.setItem(col.localKey, JSON.stringify(mergedData));
            if (mergedData.length > 0) {
                localStorage.setItem(col.localKey + '_backup', JSON.stringify(mergedData));
            }

            // Refresh active UI views
            if (col.name === 'transactions') {
                if (typeof filterTransactions === 'function' && document.getElementById('page-transactions')?.classList.contains('active')) {
                    filterTransactions();
                }
                if (typeof loadDashboard === 'function' && document.getElementById('page-dashboard')?.classList.contains('active')) {
                    loadDashboard();
                }
            }
            if (col.name === 'budgets' && typeof loadBudgetPage === 'function' && document.getElementById('page-budget')?.classList.contains('active')) {
                loadBudgetPage();
            }
            if (col.name === 'users' && typeof loadAdminUsers === 'function' && document.getElementById('admin-panel')?.classList.contains('active')) {
                loadAdminUsers();
            }
        }, (error) => {
            console.error("Sync error for " + col.name + ":", error);
            restoreFromLocalBackupIfNeeded();
            if (col.name === 'transactions') {
                if (typeof filterTransactions === 'function' && document.getElementById('page-transactions')?.classList.contains('active')) {
                    filterTransactions();
                }
                if (typeof loadDashboard === 'function' && document.getElementById('page-dashboard')?.classList.contains('active')) {
                    loadDashboard();
                }
            }
            if (error && error.code === 'permission-denied' && !firebasePermissionErrorShown) {
                firebasePermissionErrorShown = true;
                console.warn('Firestore Rules 30-day Test Mode expired. Data lokal tetap diamankan.');
            }
        });
    });
}

// Manual & Automatic Data Recovery Function
function recoverLastTransactions() {
    localStorage.removeItem('lpq_manual_reset');
    restoreFromLocalBackupIfNeeded();

    const currentTx = getData('lpq_transactions') || [];

    if (window.db) {
        window.db.collection('transactions').get().then(snap => {
            if (!snap.empty) {
                const cloudTx = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    if (d && !d.id) d.id = doc.id;
                    cloudTx.push(d);
                });
                const mergedMap = new Map();
                currentTx.forEach(t => { if (t && t.id) mergedMap.set(t.id, t); });
                cloudTx.forEach(t => { if (t && t.id) mergedMap.set(t.id, t); });
                const merged = Array.from(mergedMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
                setData('lpq_transactions', merged);
                localStorage.setItem('lpq_transactions_backup', JSON.stringify(merged));
                if (typeof loadDashboard === 'function') loadDashboard();
                if (typeof loadTransactionsPage === 'function') loadTransactionsPage();
                showToast(`Berhasil menyinkronkan & memulihkan ${merged.length} transaksi dari Cloud Firebase!`, 'success');
            } else {
                restoreRecordedOctoberTransactions();
            }
        }).catch(err => {
            console.warn('Cloud fetch blocked, restoring from recorded archive:', err);
            restoreRecordedOctoberTransactions();
        });
    } else {
        restoreRecordedOctoberTransactions();
    }
}

function restoreRecordedOctoberTransactions() {
    const currentTx = getData('lpq_transactions') || [];
    const existingMap = new Map();
    currentTx.forEach(t => {
        if (t && t.id) existingMap.set(t.id, t);
    });

    ARCHIVED_OCTOBER_TRANSACTIONS.forEach(item => {
        const duplicateByDesc = currentTx.some(t =>
            t.date === item.date &&
            (t.description || '').trim().toLowerCase() === item.description.trim().toLowerCase() &&
            Number(t.amount) === Number(item.amount)
        );
        if (!existingMap.has(item.id) && !duplicateByDesc) {
            existingMap.set(item.id, item);
        }
    });

    const merged = Array.from(existingMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    setData('lpq_transactions', merged);
    localStorage.setItem('lpq_transactions_backup', JSON.stringify(merged));

    if (window.db) {
        const batch = window.db.batch();
        merged.forEach(t => {
            batch.set(window.db.collection('transactions').doc(t.id), t, { merge: true });
        });
        batch.commit().catch(err => {
            merged.forEach(t => queuePendingSync('transactions', 'set', t));
        });
    }

    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadTransactionsPage === 'function') loadTransactionsPage();
    showToast(`Data berhasil dipulihkan (${merged.length} transaksi aktif)!`, 'success');
}

// Keep setData wrapper safe so every non-empty array write also updates local backup
const originalSetData = window.setData;
window.setData = function(key, data) {
    originalSetData(key, data);
    if (Array.isArray(data) && data.length > 0) {
        try {
            localStorage.setItem(key + '_backup', JSON.stringify(data));
        } catch (e) {
            console.error('Backup storage error:', e);
        }
    }
};

// Start sync on load
document.addEventListener('DOMContentLoaded', () => {
    restoreFromLocalBackupIfNeeded();
    setTimeout(initRealtimeSync, 300);
});
