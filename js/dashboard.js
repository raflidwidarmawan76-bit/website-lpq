window.myCharts = {};

function loadDashboard() {
    updateStatCards();
    initCharts();
    loadRecentTransactions();
    populateYearSelect();
    updateFinancialAnalysis();
}

function updateStatCards() {
    const transactions = getData('lpq_transactions') || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let income = 0;
    let expense = 0;
    let count = 0;
    
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            if (t.type === 'income') income += Number(t.amount);
            if (t.type === 'expense') expense += Number(t.amount);
            count++;
        }
    });
    
    const balance = income - expense;
    
    const elIncome = document.getElementById('stat-income');
    const elExpense = document.getElementById('stat-expense');
    const elBalance = document.getElementById('stat-balance');
    const elCount = document.getElementById('stat-count');
    
    if (elIncome) animateCounter(elIncome, income, true);
    if (elExpense) animateCounter(elExpense, expense, true);
    if (elBalance) animateCounter(elBalance, balance, true);
    if (elCount) animateCounter(elCount, count, false);
}

function animateCounter(element, target, isCurrency) {
    if (!element) return;
    const duration = 1000;
    const steps = 30;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let current = 0;
    
    const interval = setInterval(() => {
        current += target / steps;
        if ((target >= 0 && current >= target) || (target < 0 && current <= target)) {
            current = target;
            clearInterval(interval);
        }
        element.textContent = isCurrency ? formatCurrency(Math.floor(current)) : Math.floor(current);
    }, stepTime);
}

function initCharts() {
    if (typeof Chart === 'undefined') return;
    
    const yearSelect = document.getElementById('chart-year-select');
    const year = yearSelect ? parseInt(yearSelect.value) || new Date().getFullYear() : new Date().getFullYear();
    
    const transactions = getData('lpq_transactions') || [];
    
    initCashflowChart(transactions, year);
    initIncomePieChart(transactions, year);
    initExpensePieChart(transactions, year);
}

function initCashflowChart(transactions, year) {
    const ctx = document.getElementById('cashflow-chart');
    if (!ctx) return;
    
    if (window.myCharts.cashflow) {
        window.myCharts.cashflow.destroy();
    }
    
    const monthlyIncome = Array(12).fill(0);
    const monthlyExpense = Array(12).fill(0);
    
    transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year) {
            const m = d.getMonth();
            if (t.type === 'income') monthlyIncome[m] += Number(t.amount);
            else if (t.type === 'expense') monthlyExpense[m] += Number(t.amount);
        }
    });
    
    window.myCharts.cashflow = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [
                { label: 'Pemasukan', backgroundColor: '#2e7d32', data: monthlyIncome },
                { label: 'Pengeluaran', backgroundColor: '#d32f2f', data: monthlyExpense }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: function(val) { return 'Rp ' + (val/1000) + 'k'; } } } }
        }
    });
}

function initIncomePieChart(transactions, year) {
    const ctx = document.getElementById('income-pie-chart');
    if (!ctx) return;
    if (window.myCharts.income) window.myCharts.income.destroy();
    
    const totals = {};
    INCOME_CATEGORIES.forEach(c => totals[c] = 0);
    
    transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year && t.type === 'income' && totals[t.category] !== undefined) {
            totals[t.category] += Number(t.amount);
        }
    });
    
    window.myCharts.income = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: INCOME_CATEGORIES,
            datasets: [{
                data: Object.values(totals),
                backgroundColor: ['#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784', '#a5d6a7']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function initExpensePieChart(transactions, year) {
    const ctx = document.getElementById('expense-pie-chart');
    if (!ctx) return;
    if (window.myCharts.expense) window.myCharts.expense.destroy();
    
    const totals = {};
    EXPENSE_CATEGORIES.forEach(c => totals[c] = 0);
    
    transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year && t.type === 'expense' && totals[t.category] !== undefined) {
            totals[t.category] += Number(t.amount);
        }
    });
    
    window.myCharts.expense = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: EXPENSE_CATEGORIES,
            datasets: [{
                data: Object.values(totals),
                backgroundColor: ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#f44336', '#ef5350', '#e57373', '#ef9a9a', '#ffcdd2', '#ffebee']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function updateDashboardCharts() {
    initCharts();
}

function loadRecentTransactions() {
    const tbody = document.getElementById('recent-transactions');
    if (!tbody) return;
    
    const transactions = getData('lpq_transactions') || [];
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = transactions.slice(0, 5);
    
    tbody.innerHTML = '';
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada transaksi</td></tr>';
        return;
    }
    
    recent.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? 'text-success' : 'text-danger';
        const sign = t.type === 'income' ? '+' : '-';
        const typeLabel = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        tr.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td>${t.description}</td>
            <td><span class="badge ${t.type === 'income' ? 'bg-success' : 'bg-danger'}">${t.category}</span></td>
            <td><span class="badge "></span></td>
            <td></td>
            <td class=" font-weight-bold"> </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateYearSelect() {
    const select = document.getElementById('chart-year-select');
    if (!select) return;
    
    const transactions = getData('lpq_transactions') || [];
    const years = new Set([new Date().getFullYear()]);
    transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const val = select.value;
    
    select.innerHTML = '';
    sortedYears.forEach(y => {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        select.appendChild(option);
    });
    
    if (val && sortedYears.includes(parseInt(val))) select.value = val;
    select.onchange = updateDashboardCharts;
}

function updateFinancialAnalysis() {
    const transactions = getData('lpq_transactions') || [];
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += Number(t.amount);
        if (t.type === 'expense') totalExpense += Number(t.amount);
    });
    
    const balance = totalIncome - totalExpense;
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : (totalExpense > 0 ? 100 : 0);
    
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = lastDay - currentDay + 1;
    
    const safeDailyExpense = balance > 0 ? (balance / remainingDays) : 0;
    const safeMonthlyExpense = balance > 0 ? balance : 0;
    
    const statusEl = document.getElementById('analysis-status');
    const tipsEl = document.getElementById('analysis-tips');
    
    if (!statusEl || !tipsEl) return;
    
    let statusHTML = '';
    let tipsHTML = '';
    
    const moneyInfoHTML = `
        <li style="margin-bottom: 10px; list-style: none; padding: 10px; background: var(--bg); border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px; margin-bottom: 5px;">
                <span style="color: var(--text-secondary);">Total Uang Lembaga:</span>
                <strong>${formatCurrency(balance)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px; margin-bottom: 5px;">
                <span style="color: var(--text-secondary);">Batas Aman Pengeluaran / Hari:</span>
                <strong class="text-success">${formatCurrency(safeDailyExpense)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px;">
                <span style="color: var(--text-secondary);">Sisa Uang Bulan Ini:</span>
                <strong class="text-primary">${formatCurrency(safeMonthlyExpense)}</strong>
            </div>
        </li>
    `;
    
    if (totalIncome === 0 && totalExpense === 0) {
        statusHTML = '<i class="fas fa-info-circle text-primary"></i> Belum ada data keuangan untuk dianalisis.';
        tipsHTML = '<li>Mulai catat transacsi pemasukan dan pengeluaran lembaga Anda.</li>';
    } else if (expenseRatio > 90 || balance < 0) {
        statusHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Status: TERANCAM (Kritis)';
        tipsHTML = moneyInfoHTML + `
            <li><strong class="text-danger">Peringatan:</strong> Pengeluaran mencapai ${expenseRatio.toFixed(1)}% dari total aset/pemasukan. Keuangan lembaga dalam kondisi defisit atau sangat beresiko.</li>
            <li><strong>Evaluasi Anggaran:</strong> Segera bekukan semua pengeluaran sekunder. Fokus hanya pada kebutuhan harian esensial.</li>
            <li><strong>Solusi Cepat:</strong> Lakukan penggalangan dana darurat (infaq/donatur) untuk menyelamatkan operasional lembaga.</li>
        `;
    } else if (expenseRatio > 65) {
        statusHTML = '<i class="fas fa-exclamation-circle text-warning"></i> Status: WASPADA (Ketahanan Menengah)';
        tipsHTML = moneyInfoHTML + `
            <li><strong class="text-warning">Perhatian:</strong> Rasio pengeluaran berada di ${expenseRatio.toFixed(1)}%. Laju arus kas cukup ketat.</li>
            <li><strong>Saran Pengeluaran</strong> Jangan melebihi ${formatCurrency(safeDailyExpense)} per hari agar kas tidak habis sebelum akhir bulan.</li>
            <li><strong>Optimalisasi:</strong> Tunda pembelian inventaris baru dan alihkan dana untuk mengamankan gaji tenaga pengajar.</li>
        `;
    } else {
        statusHTML = '<i class="fas fa-check-circle text-success"></i> Status: AMAN (Ketahanan Sangat Baik)';
        tipsHTML = moneyInfoHTML + `
            <li><strong class="text-success">Sehat:</strong> Keuangan stabil dengan rasio pengeluaran ${expenseRatio.toFixed(1)}%. Cadangan dana lembaga sangat mencukupi.</li>
            <li><strong>Saran Pengeluaran:</strong> Anda bisa menggunakan anggaran hingga ${formatCurrency(safeDailyExpense)}/hari dengan sangat aman.</li>
            <li><strong>Pengembangan:</strong> Sisa dana dapat dialokasikan untuk pemeliharaan gedung atau perluasan program pendidikan Al-Quran.</li>
        `;
    }
    
    statusEl.innerHTML = statusHTML;
    tipsEl.innerHTML = tipsHTML;
}


