let currentTransactionPage = 1;

function loadTransactionsPage() {
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
        const currentCat = catSelect.value;
        catSelect.innerHTML = '<option value="">Semua Kategori</option>';
        ALL_CATEGORIES.forEach(c => {
            catSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
        if (currentCat) catSelect.value = currentCat;
    }
    
    filterTransactions();
}

function resetTransactionFilters() {
    const searchEl = document.getElementById('filter-search');
    const typeEl = document.getElementById('filter-type');
    const catEl = document.getElementById('filter-category');
    const monthEl = document.getElementById('filter-month');
    if (searchEl) searchEl.value = '';
    if (typeEl) typeEl.value = '';
    if (catEl) catEl.value = '';
    if (monthEl) monthEl.value = '';
    filterTransactions();
}

function filterTransactions() {
    const search = document.getElementById('filter-search')?.value.toLowerCase() || '';
    const type = document.getElementById('filter-type')?.value || '';
    const category = document.getElementById('filter-category')?.value || '';
    const month = document.getElementById('filter-month')?.value || '';
    
    let transactions = getData('lpq_transactions') || [];
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const filtered = transactions.filter(t => {
        const desc = (t.description || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const amt = (t.amount !== undefined && t.amount !== null) ? t.amount.toString() : '';
        const matchSearch = desc.includes(search) || cat.includes(search) || amt.includes(search);
        const matchType = type ? t.type === type : true;
        const matchCategory = category ? t.category === category : true;
        const matchMonth = month ? (t.date && t.date.startsWith(month)) : true;
        return matchSearch && matchType && matchCategory && matchMonth;
    });
    
    currentTransactionPage = 1;
    renderTransactions(filtered, transactions.length);
}

function renderTransactions(filteredData, totalAllCount = 0) {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        if (totalAllCount > 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center">Tidak ada transaksi pada filter bulan/pencarian ini. <button type="button" class="btn btn-sm btn-outline" style="margin-left:8px;" onclick="resetTransactionFilters()">Tampilkan Semua (${totalAllCount} Transaksi)</button></td></tr>`;
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Data tidak ditemukan</td></tr>';
        }
        renderPagination(0);
        return;
    }
    
    const startIndex = (currentTransactionPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    pageData.forEach((t, i) => {
        const tr = document.createElement('tr');
        const typeLabel = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const color = t.type === 'income' ? 'text-success' : 'text-danger';
        const sign = t.type === 'income' ? '+' : '-';
        
        tr.innerHTML = `
            <td>${startIndex + i + 1}</td>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || '-'}</td>
            <td><span class="badge bg-secondary">${t.category}</span></td>
            <td><span class="badge ${t.type === 'income' ? 'bg-success' : 'bg-danger'}">${typeLabel}</span></td>
            <td>${t.wallet || '-'}</td>
            <td class="${color} font-weight-bold">${sign} ${formatCurrency(t.amount)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openTransactionModal('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction('${t.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    renderPagination(filteredData.length);
}

function renderPagination(totalItems) {
    const pagination = document.getElementById('transactions-pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;
    
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentTransactionPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentTransactionPage - 1}, event)">Sebelumnya</a>`;
    pagination.appendChild(prevLi);
    
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentTransactionPage === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i}, event)">${i}</a>`;
        pagination.appendChild(li);
    }
    
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentTransactionPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentTransactionPage + 1}, event)">Selanjutnya</a>`;
    pagination.appendChild(nextLi);
}

function changePage(page, event) {
    if (event) event.preventDefault();
    currentTransactionPage = page;
    filterTransactions();
}

function openTransactionModal(editId = null) {
    const formHTML = `
        <form onsubmit="saveTransaction(event, '${editId || ''}')">
            <div class="form-group mb-3">
                <label>Jenis Transaksi <span class="text-danger">*</span></label>
                <select id="tx-type" class="form-control" required onchange="updateCategoryOptions()">
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                </select>
            </div>
            <div class="form-group mb-3">
                <label>Kategori <span class="text-danger">*</span></label>
                <select id="tx-category" class="form-control" required></select>
            </div>
            <div class="form-group mb-3">
    <label>Sumber Dana / Dompet <span class="text-danger">*</span></label>
    <select id="tx-wallet" class="form-control" required>
        <optgroup label="Tunai">
            <option value="Cash">Cash (Uang Tunai)</option>
        </optgroup>
        <optgroup label="E-Wallet">
            <option value="ShopeePay">ShopeePay</option>
            <option value="OVO">OVO</option>
            <option value="DANA">DANA</option>
            <option value="GoPay">GoPay</option>
            <option value="LinkAja">LinkAja</option>
        </optgroup>
        <optgroup label="Bank Nasional">
            <option value="Bank BCA">Bank BCA</option>
            <option value="Bank Mandiri">Bank Mandiri</option>
            <option value="Bank BNI">Bank BNI</option>
            <option value="Bank BRI">Bank BRI</option>
            <option value="Bank BSI">Bank BSI</option>
            <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
            <option value="Bank Permata">Bank Permata</option>
            <option value="Bank Danamon">Bank Danamon</option>
            <option value="Bank Mega">Bank Mega</option>
            <option value="Bank BTN">Bank BTN</option>
            <option value="Bank DKI">Bank DKI</option>
            <option value="Bank Muamalat">Bank Muamalat</option>
        </optgroup>
    </select>
</div>
            <div class="form-group mb-3">
                <label>Jumlah (Rp) <span class="text-danger">*</span></label>
                <input type="number" id="tx-amount" class="form-control" min="0" required placeholder="Masukkan jumlah">
            </div>
            <div class="form-group mb-3">
                <label>Tanggal <span class="text-danger">*</span></label>
                <input type="date" id="tx-date" class="form-control" required>
            </div>
            <div class="form-group mb-4">
                <label>Keterangan <span style="font-size: 0.8em; color: var(--text-secondary);">(Opsional)</span></label>
                <textarea id="tx-description" class="form-control" rows="3" placeholder="Keterangan transaksi"></textarea>
            </div>
            <button type="submit" class="btn btn-primary w-100">${editId ? 'Perbarui' : 'Simpan'} Transaksi</button>
        </form>
    `;
    
    openModal(editId ? 'Edit Transaksi' : 'Tambah Transaksi', formHTML);
    updateCategoryOptions();
    
    if (editId) {
        const transactions = getData('lpq_transactions') || [];
        const t = transactions.find(x => x.id === editId);
        if (t) {
            document.getElementById('tx-type').value = t.type;
            updateCategoryOptions();
            document.getElementById('tx-category').value = t.category;
            if (t.wallet) document.getElementById('tx-wallet').value = t.wallet;
            document.getElementById('tx-amount').value = t.amount;
            document.getElementById('tx-date').value = t.date;
            document.getElementById('tx-description').value = t.description;
        }
    } else {
        document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    }
}

function updateCategoryOptions() {
    const typeSelect = document.getElementById('tx-type');
    const catSelect = document.getElementById('tx-category');
    if (!typeSelect || !catSelect) return;
    
    const categories = typeSelect.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function saveTransaction(event, editId) {
    event.preventDefault();
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const amount = Number(document.getElementById('tx-amount').value);
    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-description').value.trim();
    const wallet = document.getElementById('tx-wallet').value;
    
    const user = getData('lpq_current_user');
    const transactions = getData('lpq_transactions') || [];
    
    if (editId) {
        const index = transactions.findIndex(t => t.id === editId);
        if (index > -1) {
            transactions[index] = {
                ...transactions[index],
                type,
                category,
                wallet,
                amount,
                date,
                description,
                updatedAt: new Date().toISOString()
            };
            logActivity('edit_transaction', `Edit transaksi: ${description || category} (${formatCurrency(amount)})`);
            showToast('Transaksi berhasil diperbarui!');
        }
    } else {
        transactions.push({
            id: generateId(), type, category, wallet, amount, date, description,
            createdBy: user ? user.id : 'unknown', createdAt: new Date().toISOString()
        });
        logActivity('add_transaction', `Tambah transaksi: ${description || category} (${formatCurrency(amount)})`);
        showToast('Transaksi berhasil ditambahkan!');
    }
    
    localStorage.removeItem('lpq_manual_reset');
    setData('lpq_transactions', transactions);
    localStorage.setItem('lpq_transactions_backup', JSON.stringify(transactions));
    if (window.db) {
        const t = editId ? transactions.find(x => x.id === editId) : transactions[transactions.length - 1];
        if (t) {
            window.db.collection('transactions').doc(t.id).set(t).catch(err => {
                console.error('Gagal menyimpan transaksi ke Firebase:', err);
                if (typeof queuePendingSync === 'function') queuePendingSync('transactions', 'set', t);
            });
        }
    }
    closeModal();
    loadTransactionsPage();
    if (typeof loadDashboard === 'function') {
        const dashPage = document.getElementById('page-dashboard');
        if (dashPage && dashPage.classList.contains('active')) {
            loadDashboard();
        }
    }
}

function deleteTransaction(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    let transactions = getData('lpq_transactions') || [];
    const tx = transactions.find(t => t.id === id);
    const updated = transactions.filter(t => t.id !== id);
    setData('lpq_transactions', updated);
    localStorage.setItem('lpq_transactions_backup', JSON.stringify(updated));
    if (typeof markItemDeleted === 'function') markItemDeleted(id);
    if (window.db) {
        window.db.collection('transactions').doc(id).delete().catch(err => {
            console.error('Gagal menghapus transaksi di Firebase:', err);
            if (typeof queuePendingSync === 'function') queuePendingSync('transactions', 'delete', { id });
        });
    }
    if (tx) logActivity('delete_transaction', `Hapus transaksi: ${tx.description || tx.category}`);
    showToast('Transaksi dihapus!', 'success');
    loadTransactionsPage();
}


