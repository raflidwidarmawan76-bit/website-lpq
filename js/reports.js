// js/reports.js - Handles report generation and exporting

function generateReport() {
    const type = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showToast('Pilih periode tanggal awal dan akhir', 'error');
        return;
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (start > end) {
        showToast('Tanggal awal tidak boleh lebih besar dari tanggal akhir', 'error');
        return;
    }
    
    const transactions = getData('lpq_transactions') || [];
    
    const filtered = transactions.filter(t => {
        const d = new Date(t.date);
        let typeMatch = true;
        if (type === 'income') typeMatch = t.type === 'income';
        if (type === 'expense') typeMatch = t.type === 'expense';
        
        return d >= start && d <= end && typeMatch;
    });
    
    renderReport(filtered, type);
    document.getElementById('report-content').style.display = 'block';
    
    // Smooth scroll to results
    setTimeout(() => {
        document.getElementById('report-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function renderReport(data, type) {
    let totalIncome = 0;
    let totalExpense = 0;
    
    const incomeData = [];
    const expenseData = [];
    
    data.forEach(t => {
        if (t.type === 'income') {
            totalIncome += Number(t.amount);
            incomeData.push(t);
        } else {
            totalExpense += Number(t.amount);
            expenseData.push(t);
        }
    });
    
    document.getElementById('report-total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('report-total-expense').textContent = formatCurrency(totalExpense);
    
    const netEl = document.getElementById('report-net');
    const net = totalIncome - totalExpense;
    netEl.textContent = formatCurrency(Math.abs(net));
    
    if (net < 0) {
        netEl.className = 'report-value text-danger';
        netEl.textContent = '- ' + netEl.textContent;
    } else {
        netEl.className = 'report-value text-primary';
    }
    
    renderReportTable('report-income-tbody', incomeData);
    renderReportTable('report-expense-tbody', expenseData);
    
    document.getElementById('report-income-total').innerHTML = '<strong>' + formatCurrency(totalIncome) + '</strong>';
    document.getElementById('report-expense-total').innerHTML = '<strong>' + formatCurrency(totalExpense) + '</strong>';
    
    initReportChart(incomeData, expenseData);
}

function renderReportTable(tbodyId, data) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data</td></tr>';
        return;
    }
    
    data.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((t, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || t.category}</td>
            <td><span class="badge bg-secondary">${t.category}</span></td>
            <td>${t.wallet || '-'}</td>
            <td class="text-right">${formatCurrency(t.amount)}</td>
        `;
        tbody.appendChild(tr);
    });
}

let reportChartInstance = null;
function initReportChart(incomeData, expenseData) {
    const canvas = document.getElementById('report-chart');
    if (!canvas) return;
    
    if (reportChartInstance) {
        reportChartInstance.destroy();
    }
    
    const dataByDate = {};
    
    incomeData.forEach(t => {
        const d = t.date;
        if (!dataByDate[d]) dataByDate[d] = { income: 0, expense: 0 };
        dataByDate[d].income += Number(t.amount);
    });
    
    expenseData.forEach(t => {
        const d = t.date;
        if (!dataByDate[d]) dataByDate[d] = { income: 0, expense: 0 };
        dataByDate[d].expense += Number(t.amount);
    });
    
    const sortedDates = Object.keys(dataByDate).sort((a, b) => new Date(a) - new Date(b));
    
    const labels = sortedDates.map(d => formatDate(d));
    const incomeSeries = sortedDates.map(d => dataByDate[d].income);
    const expenseSeries = sortedDates.map(d => dataByDate[d].expense);
    
    const ctx = canvas.getContext('2d');
    reportChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeSeries,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Pengeluaran',
                    data: expenseSeries,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) return 'Rp ' + (value/1000000) + 'M';
                            if (value >= 1000) return 'Rp ' + (value/1000) + 'K';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

function getFilteredReportData() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const type = document.getElementById('report-type').value;
    
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const transactions = getData('lpq_transactions') || [];
    
    const filtered = transactions.filter(t => {
        const d = new Date(t.date);
        let typeMatch = true;
        if (type === 'income') typeMatch = t.type === 'income';
        if (type === 'expense') typeMatch = t.type === 'expense';
        return d >= start && d <= end && typeMatch;
    });
    
    return {
        startDate: start,
        endDate: end,
        type: type,
        filtered: filtered
    };
}

function exportToExcel() {
    const data = getFilteredReportData();
    if (data.filtered.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'warning');
        return;
    }
    
    if (typeof XLSX === 'undefined') {
        showToast('Library Excel belum dimuat, silakan coba lagi', 'error');
        return;
    }
    
    const exportData = [];
    let runningBalance = 0;
    
    const chronologicalData = [...data.filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    chronologicalData.forEach(t => {
        const amount = Number(t.amount);
        let inc = 0, exp = 0;
        
        if (t.type === 'income') {
            inc = amount;
            runningBalance += amount;
        } else {
            exp = amount;
            runningBalance -= amount;
        }
        
        exportData.push({
            'TANGGAL': formatDate(t.date),
            'KETERANGAN': t.description || t.category,
            'SUMBER': t.wallet || '-',
            'PEMASUKAN': inc,
            'PENGELUARAN': exp,
            'SALDO': runningBalance
        });
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, 'Laporan_Keuangan_' + new Date().getTime() + '.xlsx');
    
    logActivity('export_excel', 'Export laporan ke Excel');
    showToast('File Excel berhasil diunduh!', 'success');
}

// --- PDF PREVIEW & EXPORT FEATURE ---

let currentPDFData = null;
let currentLogoBase64 = null;
let activePDFDoc = null;

function exportToPDF() {
    const data = getFilteredReportData();
    if (!data || data.filtered.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'warning');
        return;
    }
    
    if (typeof jspdf === 'undefined') {
        showToast('Library PDF belum dimuat, silakan coba lagi', 'error');
        return;
    }
    
    currentPDFData = data;
    
    // Default logo loading
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        currentLogoBase64 = canvas.toDataURL('image/png');
        
        showPDFPreviewModal();
    };
    img.onerror = function() {
        currentLogoBase64 = null;
        showPDFPreviewModal();
    };
    img.src = 'assets/logo.png';
}

function showPDFPreviewModal() {
    const formHTML = `
        <div class="row" style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div class="col" style="flex: 1;">
                <label style="font-size: 0.9em; font-weight: bold; margin-bottom: 5px; display: block;">Ukuran Kertas</label>
                <select id="pdf-size" class="form-control" onchange="updatePDFPreview()">
                    <option value="a4">A4 (Standar)</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal (F4/Folio)</option>
                </select>
            </div>
            <div class="col" style="flex: 1;">
                <label style="font-size: 0.9em; font-weight: bold; margin-bottom: 5px; display: block;">Orientasi</label>
                <select id="pdf-orientation" class="form-control" onchange="updatePDFPreview()">
                    <option value="p">Portrait (Berdiri)</option>
                    <option value="l">Landscape (Mendatar)</option>
                </select>
            </div>
        </div>
        <div class="pdf-preview-container" style="height: 50vh; width: 100%; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 20px; overflow: hidden; background: #f1f5f9;">
            <iframe id="pdf-preview-frame" style="width: 100%; height: 100%; border: none;" title="PDF Preview"></iframe>
        </div>
        <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-outline" style="flex: 1;" onclick="closeModal()">Batal</button>
            <button type="button" class="btn btn-danger" style="flex: 2;" onclick="downloadCurrentPDF()"><i class="fas fa-download"></i> Unduh PDF</button>
        </div>
    `;
    
    openModal('Preview & Pengaturan PDF', formHTML);
    
    // Small delay to let modal render before updating iframe
    setTimeout(updatePDFPreview, 100);
}

function updatePDFPreview() {
    const size = document.getElementById('pdf-size').value;
    const orientation = document.getElementById('pdf-orientation').value;
    const iframe = document.getElementById('pdf-preview-frame');
    
    if (!iframe) return;
    
    try {
        const { jsPDF } = window.jspdf;
        activePDFDoc = buildPDFDocument(jsPDF, currentPDFData, currentLogoBase64, size, orientation);
        
        // Output to blob URL for iframe preview (solves Chrome block on data URI)
        const blobUrl = activePDFDoc.output('bloburl');
        iframe.src = blobUrl;
    } catch (e) {
        console.error("Error generating preview:", e);
        showToast('Gagal merender preview', 'error');
    }
}

function downloadCurrentPDF() {
    if (activePDFDoc) {
        activePDFDoc.save('Laporan_Keuangan_LPQ_' + new Date().getTime() + '.pdf');
        logActivity('export_pdf', 'Export laporan ke PDF');
        showToast('Laporan PDF berhasil diunduh!', 'success');
        closeModal();
    }
}

function buildPDFDocument(jsPDF, data, logoImg, size, orientation) {
    const doc = new jsPDF(orientation, 'mm', size);
    let currentY = 15;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // 1. HEADER
    if (logoImg) {
        doc.addImage(logoImg, 'PNG', 15, currentY, 25, 25);
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text("LPQ BAITUL MA'SUM", 45, currentY + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Lembaga Pendidikan Al-Qur'an", 45, currentY + 16);
    doc.text("Surabaya", 45, currentY + 21);
    
    currentY += 30;
    
    // LINE
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(1);
    doc.line(15, currentY, pageWidth - 15, currentY);
    currentY += 10;
    
    // TITLE
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    const startMonth = data.startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    const endMonth = data.endDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    let periodText = 'LAPORAN KEUANGAN BULAN ' + startMonth;
    if (startMonth !== endMonth) {
        periodText = 'LAPORAN KEUANGAN PERIODE ' + formatDate(data.startDate) + ' S/D ' + formatDate(data.endDate);
    }
    
    doc.text(periodText, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // DATA PREP
    const tableBody = [];
    
    let runningBalance = 0;
    let periodIncome = 0;
    let periodExpense = 0;
    
    const chronologicalData = [...data.filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    chronologicalData.forEach(t => {
        const amount = Number(t.amount);
        let inc = '', exp = '';
        if (t.type === 'income') {
            inc = formatCurrency(amount);
            runningBalance += amount;
            periodIncome += amount;
        } else {
            exp = formatCurrency(amount);
            runningBalance -= amount;
            periodExpense += amount;
        }
        
        tableBody.push([
            formatDate(t.date),
            t.description || t.category,
            t.wallet || '-',
            inc,
            exp,
            formatCurrency(runningBalance)
        ]);
    });
    
    // 2. TABLE
    if (doc.autoTable) {
        doc.autoTable({
            startY: currentY,
            head: [['TANGGAL', 'KETERANGAN', 'SUMBER', 'PEMASUKAN', 'PENGELUARAN', 'SALDO']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [46, 125, 50],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: [0, 0, 0]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                1: { halign: 'left', cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 25 },
                3: { halign: 'right', cellWidth: orientation === 'l' ? 45 : 30 },
                4: { halign: 'right', cellWidth: orientation === 'l' ? 45 : 30 },
                5: { halign: 'right', cellWidth: orientation === 'l' ? 45 : 30, fontStyle: 'bold', fillColor: [240, 248, 240] }
            },
            alternateRowStyles: {
                fillColor: [252, 252, 252]
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
        
        doc.autoTable({
            startY: currentY,
            head: [['', 'PEMASUKAN PERIODE INI', 'PENGELUARAN PERIODE INI', 'SALDO AKHIR']],
            body: [
                ['SALDO BERSIH', formatCurrency(periodIncome), formatCurrency(periodExpense), formatCurrency(runningBalance)]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [46, 125, 50], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold', 
                halign: 'center'
            },
            bodyStyles: {
                textColor: [0, 0, 0], 
                fontStyle: 'bold', 
                halign: 'center', 
                minCellHeight: 15, 
                valign: 'middle'
            },
            columnStyles: {
                0: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' }
            }
        });
    }
    
    // 3. WATERMARK (DRAWN ON EVERY PAGE)
    if (logoImg && doc.GState) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            // Draw on top with 12% opacity so it's visible but not blocking text
            doc.setGState(new doc.GState({opacity: 0.12}));
            
            const imgSize = orientation === 'l' ? 140 : 120;
            const xPos = (pageWidth - imgSize) / 2;
            const yPos = (pageHeight - imgSize) / 2;
            
            doc.addImage(logoImg, 'PNG', xPos, yPos, imgSize, imgSize);
            doc.setGState(new doc.GState({opacity: 1})); 
        }
    }
    
    return doc;
}
