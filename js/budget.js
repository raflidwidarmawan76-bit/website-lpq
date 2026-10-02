function loadBudgetPage() {
    populateBudgetMonthSelect();
    renderBudgetTable();
}

function populateBudgetMonthSelect() {
    const select = document.getElementById('budget-month-select');
    if (!select) return;
    
    if (select.options.length === 0) {
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            select.appendChild(opt);
        }
    }
    select.onchange = renderBudgetTable;
}

function renderBudgetTable() {
    const select = document.getElementById('budget-month-select');
    const period = select ? select.value : `${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2,'0')}`;
    
    const budgets = (getData('lpq_budgets') || []).filter(b => b.period === period);
    const transactions = (getData('lpq_transactions') || []).filter(t => t.type === 'expense' && t.date.startsWith(period));
    
    let totalPlanned = 0, totalActual = 0;
    const tbody = document.getElementById('budget-tbody');
    if (tbody) tbody.innerHTML = '';
    
    const chartLabels = [], chartPlanned = [], chartActual = [];
    
    if (budgets.length === 0 && tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada anggaran untuk bulan ini</td></tr>';
    }
    
    budgets.forEach(b => {
        let actual = 0;
        transactions.forEach(t => { if (t.category === b.category) actual += Number(t.amount); });
        
        const planned = Number(b.planned);
        totalPlanned += planned;
        totalActual += actual;
        
        const remaining = planned - actual;
        const pct = planned > 0 ? (actual / planned) * 100 : 0;
        
        let statusColor = 'success', statusText = 'Aman';
        if (pct > 100) { statusColor = 'danger'; statusText = 'Melebihi'; }
        else if (pct > 75) { statusColor = 'warning'; statusText = 'Perhatian'; }
        
        chartLabels.push(b.category);
        chartPlanned.push(planned);
        chartActual.push(actual);
        
        if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.category}</td>
                <td>${formatCurrency(planned)}</td>
                <td>${formatCurrency(actual)}</td>
                <td class="text-${remaining < 0 ? 'danger' : 'success'}">${formatCurrency(remaining)}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-${statusColor}" style="width: ${Math.min(pct, 100)}%;">${Math.round(pct)}%</div>
                    </div>
                </td>
                <td><span class="badge bg-${statusColor}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="openBudgetModal('${b.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBudget('${b.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
    
    const elPlanned = document.getElementById('budget-total-planned');
    const elActual = document.getElementById('budget-total-actual');
    const elRemaining = document.getElementById('budget-total-remaining');
    
    if (elPlanned) elPlanned.textContent = formatCurrency(totalPlanned);
    if (elActual) elActual.textContent = formatCurrency(totalActual);
    if (elRemaining) {
        elRemaining.textContent = formatCurrency(totalPlanned - totalActual);
        elRemaining.className = (totalPlanned - totalActual) < 0 ? 'text-danger font-weight-bold' : 'text-success font-weight-bold';
    }
    
    initBudgetChart(chartLabels, chartPlanned, chartActual);
}

function initBudgetChart(labels, planned, actual) {
    const ctx = document.getElementById('budget-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    if (window.myCharts && window.myCharts.budget) window.myCharts.budget.destroy();
    
    window.myCharts = window.myCharts || {};
    window.myCharts.budget = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Dianggarkan', backgroundColor: '#1976d2', data: planned },
                { label: 'Realisasi', backgroundColor: '#d32f2f', data: actual }
            ]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
}

function openBudgetModal(editId = null) {
    const select = document.getElementById('budget-month-select');
    const period = select ? select.value : '';
    
    const formHTML = `
        <form onsubmit="saveBudget(event, '${editId || ''}')">
            <div class="form-group mb-3">
                <label>Bulan</label>
                <input type="text" class="form-control" value="${period}" readonly id="budget-period">
            </div>
            <div class="form-group mb-3">
                <label>Kategori Pengeluaran</label>
                <select id="budget-category" class="form-control" required>
                    ${EXPENSE_CATEGORIES.map(c => '<option value="'+c+'">'+c+'</option>').join('')}
                </select>
            </div>
            <div class="form-group mb-4">
                <label>Jumlah Anggaran (Rp)</label>
                <input type="number" id="budget-amount" class="form-control" min="0" required placeholder="Masukkan jumlah">
            </div>
            <button type="submit" class="btn btn-primary w-100">${editId ? 'Perbarui' : 'Simpan'} Anggaran</button>
        </form>
    `;
    openModal(editId ? 'Edit Anggaran' : 'Tambah Anggaran', formHTML);
    
    if (editId) {
        const b = (getData('lpq_budgets') || []).find(x => x.id === editId);
        if (b) {
            document.getElementById('budget-category').value = b.category;
            document.getElementById('budget-amount').value = b.planned;
        }
    }
}

function saveBudget(event, editId) {
    event.preventDefault();
    const period = document.getElementById('budget-period').value;
    const category = document.getElementById('budget-category').value;
    const planned = Number(document.getElementById('budget-amount').value);
    
    let budgets = getData('lpq_budgets') || [];
    const user = getData('lpq_current_user');
    
    const existing = budgets.find(b => b.period === period && b.category === category && b.id !== editId);
    if (existing) {
        showToast('Kategori ini sudah dianggarkan di bulan tersebut!', 'error');
        return;
    }
    
    if (editId) {
        const idx = budgets.findIndex(b => b.id === editId);
        if (idx > -1) {
            budgets[idx].category = category;
            budgets[idx].planned = planned;
            logActivity('edit_budget', `Edit anggaran ${category}`);
        }
    } else {
        budgets.push({
            id: generateId(), category, planned, period,
            createdBy: user ? user.id : 'unknown'
        });
        logActivity('add_budget', `Tambah anggaran ${category}`);
    }
    
    setData('lpq_budgets', budgets);
    closeModal();
    showToast('Anggaran disimpan!');
    renderBudgetTable();
}

function deleteBudget(id) {
    if (!confirm('Hapus anggaran ini?')) return;
    setData('lpq_budgets', (getData('lpq_budgets') || []).filter(b => b.id !== id));
    
    // FIREBASE SYNC
    if (window.db) {
        window.db.collection('budgets').doc(id).delete().catch(console.error);
    }
    logActivity('delete_budget', 'Hapus anggaran');
    showToast('Anggaran dihapus!');
    renderBudgetTable();
}

