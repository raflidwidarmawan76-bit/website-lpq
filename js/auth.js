function showAuth(formType) {
    showPage('auth-page');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (formType === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    const users = getData('lpq_users') || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        if (user.status === 'inactive') {
            showToast('Akun Anda dinonaktifkan. Hubungi administrator.', 'error');
            return;
        }
        
        setData('lpq_current_user', user);
        logActivity('login', `User ${user.fullName} berhasil login`);
        showToast('Login berhasil! Selamat datang, ' + user.fullName);
        
        emailInput.value = '';
        passwordInput.value = '';
        
        updateSidebarUserInfo();
        showPage('main-app');
        loadDashboard();
        navigateTo('dashboard');
    } else {
        showToast('Email atau password salah!', 'error');
    }
}

function handleRegister(event) {
    event.preventDefault();
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmInput = document.getElementById('register-confirm');
    const roleInput = document.getElementById('register-role');
    const accessCodeInput = document.getElementById('register-access-code');
    
    if (!nameInput || !emailInput || !passwordInput || !confirmInput || !roleInput || !accessCodeInput) return;
    
    if (passwordInput.value !== confirmInput.value) {
        showToast('Password tidak cocok!', 'error');
        return;
    }
    
    const currentAccessCode = localStorage.getItem('lpq_access_code') || 'LPQBM2026';
    if (accessCodeInput.value !== currentAccessCode) {
        showToast('Kode akses institusi tidak valid!', 'error');
        return;
    }
    
    const users = getData('lpq_users') || [];
    if (users.some(u => u.email === emailInput.value.trim())) {
        showToast('Email sudah terdaftar!', 'error');
        return;
    }
    
    const newUser = {
        id: generateId(),
        fullName: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        role: roleInput.value,
        status: 'active',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    setData('lpq_users', users);
    
    // FIREBASE SYNC
    if (window.db) {
        window.db.collection('users').doc(newUser.id).set(newUser).catch(console.error);
    }
    
    // Auto-generate sample data if this is the very first user to give a better first impression
    if (users.length === 1) {
        let txs = getData('lpq_transactions') || [];
        if (txs.length === 0) {
            const now = new Date();
            for (let i = 0; i < 30; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
                const isIncome = Math.random() > 0.4;
                let cat, amount, desc;
                
                if (isIncome) {
                    cat = INCOME_CATEGORIES[Math.floor(Math.random() * INCOME_CATEGORIES.length)];
                    amount = Math.floor(Math.random() * 20 + 1) * 50000;
                    desc = `Pemasukan ${cat} (Sampel Awal)`;
                } else {
                    cat = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
                    amount = Math.floor(Math.random() * 40 + 1) * 25000;
                    desc = `Pengeluaran ${cat} (Sampel Awal)`;
                }
                
                txs.push({
                    id: 'sample_' + Math.random().toString(36).substr(2, 9),
                    type: isIncome ? 'income' : 'expense',
                    category: cat, amount: amount,
                    date: d.toISOString().split('T')[0],
                    description: desc,
                    createdBy: newUser.id,
                    createdAt: d.toISOString()
                });
            }
            setData('lpq_transactions', txs);
        }
    }

    logActivity('register', `User baru didaftarkan: ${newUser.fullName} (${newUser.role})`);
    showToast('Pendaftaran berhasil! Silakan login.', 'success');
    
    nameInput.value = '';
    emailInput.value = '';
    passwordInput.value = '';
    confirmInput.value = '';
    accessCodeInput.value = '';
    
    showAuth('login');
}

function handleLogout() {
    const user = getData('lpq_current_user');
    if (user) {
        logActivity('logout', `User ${user.fullName} logout`);
    }
    localStorage.removeItem('lpq_current_user');
    showPage('guest-page');
    showToast('Anda telah berhasil logout.', 'success');
}

function updateSidebarUserInfo() {
    const user = getData('lpq_current_user');
    if (!user) return;
    
    const nameEl = document.getElementById('sidebar-username');
    const roleEl = document.getElementById('sidebar-role');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const topbarAvatar = document.getElementById('topbar-avatar');
    
    if (nameEl) nameEl.textContent = user.fullName;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Bendahara';
    
    const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (topbarAvatar) topbarAvatar.textContent = initials;
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    const icon = input.parentElement.querySelector('.password-toggle i');
    if (icon) {
        if (type === 'text') {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

function updateProfile(event) {
    event.preventDefault();
    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    
    if (!nameInput || !emailInput) return;
    
    const user = getData('lpq_current_user');
    if (!user) return;
    
    const users = getData('lpq_users') || [];
    const index = users.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
        const newEmail = emailInput.value.trim();
        if (newEmail !== user.email && users.some(u => u.email === newEmail)) {
            showToast('Email sudah digunakan user lain', 'error');
            return;
        }
        
        users[index].fullName = nameInput.value.trim();
        users[index].email = newEmail;
        
        setData('lpq_users', users);
        setData('lpq_current_user', users[index]);
        
        // FIREBASE SYNC
        if (window.db) {
            window.db.collection('users').doc(users[index].id).set(users[index]).catch(console.error);
        }
        updateSidebarUserInfo();
        
        logActivity('update_profile', 'Mengubah profil pengguna');
        showToast('Profil berhasil diperbarui!');
    }
}

function changePassword(event) {
    event.preventDefault();
    const oldInput = document.getElementById('settings-old-password');
    const newInput = document.getElementById('settings-new-password');
    const confirmInput = document.getElementById('settings-confirm-password');
    
    if (!oldInput || !newInput || !confirmInput) return;
    
    const user = getData('lpq_current_user');
    if (!user) return;
    
    if (user.password !== oldInput.value) {
        showToast('Password lama salah!', 'error');
        return;
    }
    
    if (newInput.value !== confirmInput.value) {
        showToast('Password baru tidak cocok!', 'error');
        return;
    }
    
    const users = getData('lpq_users') || [];
    const index = users.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
        users[index].password = newInput.value;
        setData('lpq_users', users);
        setData('lpq_current_user', users[index]);
        
        // FIREBASE SYNC
        if (window.db) {
            window.db.collection('users').doc(users[index].id).set(users[index]).catch(console.error);
        }
        
        oldInput.value = '';
        newInput.value = '';
        confirmInput.value = '';
        
        logActivity('change_password', 'Mengubah password akun');
        showToast('Password berhasil diubah!');
    }
}

function loadSettingsPage() {
    const user = getData('lpq_current_user');
    if (!user) return;
    
    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    const roleInput = document.getElementById('settings-role');
    
    if (nameInput) nameInput.value = user.fullName;
    if (emailInput) emailInput.value = user.email;
    if (roleInput) roleInput.value = user.role === 'admin' ? 'Administrator' : 'Bendahara';

    const settings = getData('lpq_settings') || { theme: 'light' };
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === settings.theme) {
            btn.classList.add('active');
        }
    });
}



