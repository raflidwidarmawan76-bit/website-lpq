function toggleAdminPanel() {
    const user = getData('lpq_current_user');
    if (!user || user.role !== 'admin') {
        showToast('Akses ditolak! Hanya Administrator yang dapat membuka panel ini.', 'error');
        return;
    }

    const panel = document.getElementById('admin-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || !panel.style.display) {
        openAdminPanel();
    } else {
        closeAdminPanel();
    }
}

function openAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
        panel.style.display = 'block';
        setTimeout(() => panel.classList.add('active'), 10);
        loadAdminSystemInfo();
        loadAdminUsers();
        logActivity('access_admin', 'Membuka panel admin');
    }
}

function closeAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
        panel.classList.remove('active');
        setTimeout(() => panel.style.display = 'none', 300);
    }
}

function switchAdminTab(tabId) {
    document.querySelectorAll('.admin-tab-content').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    
    const btn = document.querySelector(`.admin-tab[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
    
    if (tabId === 'admin-users') loadAdminUsers();
    else if (tabId === 'admin-system') loadAdminSystemInfo();
    else if (tabId === 'admin-logs') loadAdminLogs();
}

function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    
    const users = getData('lpq_users') || [];
    tbody.innerHTML = '';
    
    users.forEach((u, i) => {
        const tr = document.createElement('tr');
        const badge = u.status === 'active' ? 'success' : 'danger';
        const role = u.role === 'admin' ? 'Administrator' : 'Bendahara';
        
        tr.innerHTML = `
            <td>${u.fullName}</td>
            <td>${u.email}</td>
            <td>${role}</td>
            <td><span class="badge bg-${badge}">${u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>${formatDate(u.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="toggleUserStatus('${u.id}')">Toggle</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAdminAddUser() {
    const formHTML = `
        <form onsubmit="adminSaveUser(event)">
            <div class="form-group mb-2">
                <label>Nama Lengkap</label>
                <input type="text" id="admin-add-name" class="form-control" required>
            </div>
            <div class="form-group mb-2">
                <label>Email</label>
                <input type="email" id="admin-add-email" class="form-control" required>
            </div>
            <div class="form-group mb-2">
                <label>Role</label>
                <select id="admin-add-role" class="form-control" required>
                    <option value="bendahara">Bendahara</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
            <div class="form-group mb-3">
                <label>Password</label>
                <input type="password" id="admin-add-pass" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">Tambah User</button>
        </form>
    `;
    openModal('Tambah User (Admin)', formHTML);
}

function adminSaveUser(event) {
    event.preventDefault();
    const name = document.getElementById('admin-add-name').value;
    const email = document.getElementById('admin-add-email').value;
    const role = document.getElementById('admin-add-role').value;
    const pass = document.getElementById('admin-add-pass').value;
    
    const users = getData('lpq_users') || [];
    if (users.some(u => u.email === email)) {
        showToast('Email sudah terdaftar', 'error');
        return;
    }
    
    users.push({
        id: generateId(), fullName: name, email: email, password: pass, role: role,
        status: 'active', createdAt: new Date().toISOString()
    });
    
    setData('lpq_users', users);
    
    // FIREBASE SYNC
    if (window.db) {
        window.db.collection('users').doc(newUser.id).set(newUser).catch(console.error);
    }
    closeModal();
    loadAdminUsers();
    showToast('User berhasil ditambahkan');
    logActivity('admin_add_user', `Admin menambah user: ${name}`);
}

function toggleUserStatus(userId) {
    const currentUser = getData('lpq_current_user');
    if (currentUser.id === userId) {
        showToast('Tidak dapat menonaktifkan akun sendiri!', 'error');
        return;
    }
    
    let users = getData('lpq_users') || [];
    const idx = users.findIndex(u => u.id === userId);
    if (idx > -1) {
        users[idx].status = users[idx].status === 'active' ? 'inactive' : 'active';
        setData('lpq_users', users);
        
        // FIREBASE SYNC
        if (window.db) {
            window.db.collection('users').doc(users[idx].id).set(users[idx]).catch(console.error);
        }
        
        loadAdminUsers();
        logActivity('admin_toggle_user', `Toggle status user ${users[idx].email}`);
    }
}

function deleteUser(userId) {
    const currentUser = getData('lpq_current_user');
    if (currentUser.id === userId) {
        showToast('Tidak dapat menghapus akun sendiri!', 'error');
        return;
    }
    if (!confirm('Hapus user ini secara permanen?')) return;
    
    let users = getData('lpq_users') || [];
    users = users.filter(u => u.id !== userId);
    setData('lpq_users', users);
    
    // FIREBASE SYNC
    if (window.db) {
        window.db.collection('users').doc(userId).delete().catch(console.error);
    }
    
    loadAdminUsers();
    logActivity('admin_delete_user', `Admin menghapus user`);
    showToast('User dihapus');
}

function loadAdminSystemInfo() {
    const codeEl = document.getElementById('admin-access-code');
    const statsEl = document.getElementById('admin-data-stats');
    const storageEl = document.getElementById('admin-storage-info');
    
    if (codeEl) {
        codeEl.textContent = 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢';
        codeEl.dataset.code = localStorage.getItem('lpq_access_code') || 'LPQBM2026';
        codeEl.dataset.visible = 'false';
    }
    
    const users = getData('lpq_users') || [];
    const tx = getData('lpq_transactions') || [];
    const bdg = getData('lpq_budgets') || [];
    
    if (statsEl) {
        statsEl.innerHTML = `
            <p><strong>Total Users:</strong> ${users.length}</p>
            <p><strong>Total Transaksi:</strong> ${tx.length}</p>
            <p><strong>Total Anggaran:</strong> ${bdg.length}</p>
        `;
    }
    
    if (storageEl) {
        let totalBytes = 0;
        for(let x in localStorage) {
            if(localStorage.hasOwnProperty(x)) {
                totalBytes += ((localStorage[x].length + x.length) * 2);
            }
        }
        storageEl.textContent = `Perkiraan Penggunaan Storage: ${(totalBytes / 1024).toFixed(2)} KB`;
    }
}

function toggleAccessCodeVisibility() {
    const el = document.getElementById('admin-access-code');
    if (!el) return;
    if (el.dataset.visible === 'true') {
        el.textContent = 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢';
        el.dataset.visible = 'false';
    } else {
        el.textContent = el.dataset.code || localStorage.getItem('lpq_access_code') || 'LPQBM2026';
        el.dataset.visible = 'true';
    }
}

function regenerateAccessCode() {
    const newCode = 'LPQ' + Math.random().toString(36).substr(2, 6).toUpperCase();
    localStorage.setItem('lpq_access_code', newCode);
    loadAdminSystemInfo();
    showToast('Kode akses baru dibuat!');
    logActivity('admin_regen_code', 'Regenerasi kode akses institusi');
}

function loadAdminLogs() {
    const tbody = document.getElementById('admin-logs-tbody');
    if (!tbody) return;
    
    const logs = getData('lpq_activity_logs') || [];
    tbody.innerHTML = '';
    
    logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(l.timestamp).toLocaleString('id-ID')}</td>
            <td>${l.userName}</td>
            <td><span class="badge bg-secondary">${l.action}</span></td>
            <td>${l.detail}</td>
        `;
        tbody.appendChild(tr);
    });
}

function clearActivityLogs() {
    if (!confirm('Bersihkan semua log aktivitas?')) return;
    setData('lpq_activity_logs', []);
    
    // FIREBASE SYNC - Wipe logs
    if (window.db) {
        window.db.collection('logs').get().then(snap => {
            const batch = window.db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            batch.commit();
        });
    }
    
    loadAdminLogs();
    showToast('Log aktivitas dibersihkan');
}

function generateSampleData() {
    if (!confirm('Ini akan menambahkan data transaksi sampel. Lanjutkan?')) return;
    
    let txs = getData('lpq_transactions') || [];
    const now = new Date();
    const user = getData('lpq_current_user');
    
    for (let i = 0; i < 50; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
        const isIncome = Math.random() > 0.5;
        let cat, amount, desc;
        
        if (isIncome) {
            cat = INCOME_CATEGORIES[Math.floor(Math.random() * INCOME_CATEGORIES.length)];
            amount = Math.floor(Math.random() * 20 + 1) * 50000;
            desc = `Pemasukan ${cat} (Sampel)`;
        } else {
            cat = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
            amount = Math.floor(Math.random() * 40 + 1) * 25000;
            desc = `Pengeluaran ${cat} (Sampel)`;
        }
        
        txs.push({
            id: generateId(),
            type: isIncome ? 'income' : 'expense',
            category: cat, amount: amount,
            date: d.toISOString().split('T')[0],
            description: desc,
            createdBy: user ? user.id : 'system',
            createdAt: d.toISOString()
        });
    }
    
    setData('lpq_transactions', txs);
    
    // FIREBASE SYNC
    if (window.db) {
        const batch = window.db.batch();
        txs.forEach(t => {
            const ref = window.db.collection('transactions').doc(t.id);
            batch.set(ref, t);
        });
        batch.commit().catch(console.error);
    }
    
    logActivity('admin_sample_data', 'Generate sample data');
    showToast('Data sampel berhasil dibuat!');
    if (typeof loadDashboard === 'function') loadDashboard();
}

function resetAllTransactionData() {
    if (!confirm('PERINGATAN: Semua data transaksi dan anggaran akan dihapus! Lanjutkan?')) return;
    if (prompt('Ketik "RESET" untuk konfirmasi:') !== 'RESET') {
        showToast('Dibatalkan', 'warning');
        return;
    }
    
    setData('lpq_transactions', []);
    setData('lpq_budgets', []);
    
    // FIREBASE SYNC - Wipe collections
    if (window.db) {
        window.db.collection('transactions').get().then(snap => {
            const batch = window.db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            batch.commit();
        });
        window.db.collection('budgets').get().then(snap => {
            const batch = window.db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            batch.commit();
        });
    }
    
    logActivity('admin_reset_data', 'Mereset semua data transaksi dan anggaran');
    showToast('Data transaksi telah direset', 'success');
    setTimeout(() => window.location.reload(), 1500);
}



