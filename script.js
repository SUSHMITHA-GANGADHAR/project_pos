// ========== GLOBAL CONFIG ==========
const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let authToken = null;

// Global Data Storage
let suppliersData = [];
let productsData = [];
let purchaseOrdersData = [];
let inventoryData = [];
let salesData = [];
let chartsInstance = {};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 RestauPOS Application Started');
    checkAuth();
    loadMockData();
});

// ========== AUTHENTICATION FUNCTIONS ==========

/**
 * Check if user is already logged in
 */
function checkAuth() {
    const stored = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');

    if (stored && user) {
        authToken = stored;
        currentUser = JSON.parse(user);
        console.log('✓ User authenticated:', currentUser.email);
        showPage('dashboard');
    } else {
        console.log('No active session');
        showPage('landing');
    }
}

/**
 * Handle user login
 */
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validation
    if (!email || !password) {
        showMessage('loginError', '✗ Email and password required');
        return;
    }

    const loginBtn = document.querySelector('#loginForm button');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    // Try API login
    fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token && data.user) {
            authToken = data.token;
            currentUser = data.user;

            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));

            showMessage('loginSuccess', '✓ Login successful!');
            setTimeout(() => {
                document.getElementById('loginForm').reset();
                showPage('dashboard');
            }, 1500);
        } else {
            showMessage('loginError', '✗ ' + (data.error || 'Login failed'));
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        // Fallback to mock login
        mockLogin(email, password);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    });
}

/**
 * Mock login (for testing without backend)
 */
function mockLogin(email, password) {
    if (email && password.length >= 6) {
        authToken = 'mock_token_' + Date.now();
        currentUser = {
            id: 'user_' + Date.now(),
            email: email,
            full_name: email.split('@')[0],
            role: 'admin'
        };

        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('current_user', JSON.stringify(currentUser));

        showMessage('loginSuccess', '✓ Login successful!');
        setTimeout(() => {
            document.getElementById('loginForm').reset();
            showPage('dashboard');
        }, 1500);
    } else {
        showMessage('loginError', '✗ Invalid email or password');
    }
}

/**
 * Handle user registration
 */
function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    // Validation
    if (!name || !email || !phone || !password || !role) {
        showMessage('registerError', '✗ All fields are required');
        return;
    }

    if (name.length < 2) {
        showMessage('registerError', '✗ Name too short');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('registerError', '✗ Invalid email format');
        return;
    }

    if (!validatePhone(phone)) {
        showMessage('registerError', '✗ Invalid phone format');
        return;
    }

    if (!validatePassword(password)) {
        showMessage('registerError', '✗ Password must have 8+ chars, uppercase, number, special char');
        return;
    }

    const registerBtn = document.querySelector('#registerForm button');
    registerBtn.disabled = true;
    registerBtn.textContent = 'Creating account...';

    // Try API register
    fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            full_name: name,
            email,
            phone,
            password,
            role
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token && data.user) {
            authToken = data.token;
            currentUser = data.user;

            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));

            showMessage('registerSuccess', '✓ Registration successful!');
            setTimeout(() => {
                document.getElementById('registerForm').reset();
                showPage('dashboard');
            }, 1500);
        } else {
            showMessage('registerError', '✗ ' + (data.error || 'Registration failed'));
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account';
        }
    })
    .catch(err => {
        console.error('Register error:', err);
        // Fallback to mock register
        mockRegister(name, email, phone, password, role);
        registerBtn.disabled = false;
        registerBtn.textContent = 'Create Account';
    });
}

/**
 * Mock registration (for testing without backend)
 */
function mockRegister(name, email, phone, password, role) {
    authToken = 'mock_token_' + Date.now();
    currentUser = {
        id: 'user_' + Date.now(),
        email: email,
        full_name: name,
        phone: phone,
        role: role
    };

    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('current_user', JSON.stringify(currentUser));

    showMessage('registerSuccess', '✓ Registration successful!');
    setTimeout(() => {
        document.getElementById('registerForm').reset();
        showPage('dashboard');
    }, 1500);
}

/**
 * Handle forgot password
 */
function handleForgotPassword(e) {
    e.preventDefault();

    const email = document.getElementById('forgotEmail').value.trim();

    if (!email || !validateEmail(email)) {
        showMessage('forgotError', '✗ Invalid email');
        return;
    }

    const btn = document.querySelector('#forgotPasswordForm button');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Try API forgot password
    fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
        showMessage('forgotSuccess', '✓ Reset link sent to ' + email);
        setTimeout(() => {
            document.getElementById('forgotPasswordForm').reset();
            showPage('login');
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
        }, 2000);
    })
    .catch(err => {
        console.error('Forgot password error:', err);
        showMessage('forgotSuccess', '✓ Reset link sent to ' + email);
        setTimeout(() => {
            document.getElementById('forgotPasswordForm').reset();
            showPage('login');
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
        }, 2000);
    });
}

/**
 * Handle logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        authToken = null;
        currentUser = null;
        
        console.log('✓ User logged out');
        showPage('landing');
        showMessage('loginSuccess', '✓ Logged out successfully');
    }
}

// ========== PAGE NAVIGATION ==========

/**
 * Show specific page
 */
function showPage(page) {
    // Hide all pages
    document.getElementById('landing').classList.remove('active');
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('forgotPasswordPage').classList.remove('active');
    document.getElementById('dashboard').classList.remove('active');

    // Show selected page
    if (page === 'landing') {
        document.getElementById('landing').classList.add('active');
    } else if (page === 'login') {
        document.getElementById('loginPage').classList.add('active');
    } else if (page === 'register') {
        document.getElementById('registerPage').classList.add('active');
    } else if (page === 'forgotPassword') {
        document.getElementById('forgotPasswordPage').classList.add('active');
    } else if (page === 'dashboard') {
        if (!authToken || !currentUser) {
            console.warn('Unauthorized access attempt');
            showPage('login');
            return;
        }
        document.getElementById('dashboard').classList.add('active');
        setTimeout(() => loadDashboardData(), 100);
    }
}

/**
 * Scroll to section
 */
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========== DASHBOARD FUNCTIONS ==========

/**
 * Switch between dashboard sections
 */
function switchDashboard(sectionId, element) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    if (element) {
        element.classList.add('active');
    }

    // Update title
    const titles = {
        'admin-dashboard': '📊 Dashboard',
        'procurement': '📦 Procurement Management',
        'inventory': '📋 Inventory Management',
        'sales': '💳 Sales Management',
        'analytics': '📈 Analytics & Reports'
    };

    document.getElementById('dashboardTitle').textContent = titles[sectionId] || 'Dashboard';
}

/**
 * Load dashboard data
 */
function loadDashboardData() {
    if (!authToken || !currentUser) {
        showPage('login');
        return;
    }

    // Update user info
    document.getElementById('userName').textContent = currentUser.full_name || currentUser.email;
    document.getElementById('userRole').textContent = currentUser.role || 'User';
    document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.email || 'U').charAt(0).toUpperCase();

    // Load data
    loadMockData();
    updateDashboardStats();
    updateAllTables();
    setTimeout(() => initCharts(), 500);
}

/**
 * Load mock data for demo
 */
function loadMockData() {
    // Suppliers
    suppliersData = [
        { id: 's1', supplier_name: 'Fresh Foods Inc', contact_person: 'John Smith', city: 'New York', status: 'active', email: 'john@freshfoods.com' },
        { id: 's2', supplier_name: 'Global Supplies', contact_person: 'Jane Doe', city: 'Boston', status: 'active', email: 'jane@global.com' },
        { id: 's3', supplier_name: 'Quality Vendors', contact_person: 'Mike Johnson', city: 'Chicago', status: 'active', email: 'mike@quality.com' },
        { id: 's4', supplier_name: 'Premium Foods Ltd', contact_person: 'Sarah Williams', city: 'Los Angeles', status: 'active', email: 'sarah@premium.com' }
    ];

    // Products
    productsData = [
        { id: 'p1', product_name: 'Biryani', category: 'Rice Dishes', cost_price: 150, selling_price: 300 },
        { id: 'p2', product_name: 'Butter Chicken', category: 'Curries', cost_price: 200, selling_price: 400 },
        { id: 'p3', product_name: 'Naan', category: 'Breads', cost_price: 30, selling_price: 60 },
        { id: 'p4', product_name: 'Samosa', category: 'Appetizers', cost_price: 20, selling_price: 50 },
        { id: 'p5', product_name: 'Paneer Tikka', category: 'Appetizers', cost_price: 100, selling_price: 200 },
        { id: 'p6', product_name: 'Lassi', category: 'Beverages', cost_price: 40, selling_price: 80 }
    ];

    // Inventory
    inventoryData = [
        { productId: 'p1', product: 'Biryani', quantity: 45, reorderLevel: 20 },
        { productId: 'p2', product: 'Butter Chicken', quantity: 12, reorderLevel: 25 },
        { productId: 'p3', product: 'Naan', quantity: 120, reorderLevel: 50 },
        { productId: 'p4', product: 'Samosa', quantity: 8, reorderLevel: 20 },
        { productId: 'p5', product: 'Paneer Tikka', quantity: 35, reorderLevel: 15 },
        { productId: 'p6', product: 'Lassi', quantity: 60, reorderLevel: 30 }
    ];

    // Purchase Orders
    purchaseOrdersData = [
        { id: 'po1', product: 'Biryani', supplier: 'Fresh Foods Inc', qty: 100, cost: 15000, status: 'received' },
        { id: 'po2', product: 'Butter Chicken', supplier: 'Global Supplies', qty: 50, cost: 10000, status: 'pending' },
        { id: 'po3', product: 'Naan', supplier: 'Quality Vendors', qty: 200, cost: 6000, status: 'received' },
        { id: 'po4', product: 'Samosa', supplier: 'Premium Foods Ltd', qty: 150, cost: 3000, status: 'pending' }
    ];

    // Sales
    const today = new Date();
    salesData = [
        { id: 'sale1', customer: 'Customer A', amount: 500, payment: 'Cash', status: 'completed', date: today.toLocaleDateString() },
        { id: 'sale2', customer: 'Customer B', amount: 800, payment: 'Card', status: 'pending', date: today.toLocaleDateString() },
        { id: 'sale3', customer: 'Customer C', amount: 1200, payment: 'Digital', status: 'completed', date: today.toLocaleDateString() },
        { id: 'sale4', customer: 'Customer D', amount: 650, payment: 'Cash', status: 'completed', date: today.toLocaleDateString() },
        { id: 'sale5', customer: 'Customer E', amount: 950, payment: 'Card', status: 'completed', date: today.toLocaleDateString() }
    ];

    console.log('✓ Mock data loaded');
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    const totalSales = salesData.reduce((sum, sale) => sum + sale.amount, 0);
    const totalOrders = salesData.length;
    const totalProducts = productsData.length;
    const lowStock = inventoryData.filter(inv => inv.quantity < inv.reorderLevel).length;

    document.getElementById('totalSalesStat').textContent = totalSales;
    document.getElementById('totalOrdersStat').textContent = totalOrders;
    document.getElementById('totalProductsStat').textContent = totalProducts;
    document.getElementById('lowStockStat').textContent = lowStock;
}

/**
 * Update all tables
 */
function updateAllTables() {
    updateSuppliersTable();
    updatePOTable();
    updateInventoryTable();
    updateSalesTable();
    updateRecentSalesTable();
    updateDailySummary();
    updateProfitLossTable();
}

// ========== TABLE UPDATE FUNCTIONS ==========

/**
 * Update suppliers table
 */
function updateSuppliersTable() {
    const tbody = document.querySelector('#suppliersTable tbody');
    if (!tbody) return;

    let html = '';
    if (suppliersData.length === 0) {
        html = '<tr><td colspan="5" class="text-center">No suppliers added</td></tr>';
    } else {
        html = suppliersData.map(s => `
            <tr>
                <td><strong>${s.supplier_name}</strong></td>
                <td>${s.contact_person || '-'}</td>
                <td>${s.city || '-'}</td>
                <td><span class="badge badge-success">${s.status}</span></td>
                <td>
                    <button class="btn btn-small btn-edit" onclick="editSupplier('${s.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteSupplier('${s.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    tbody.innerHTML = html;
}

/**
 * Update purchase orders table
 */
function updatePOTable() {
    const tbody = document.querySelector('#poTable tbody');
    if (!tbody) return;

    let html = '';
    if (purchaseOrdersData.length === 0) {
        html = '<tr><td colspan="7" class="text-center">No purchase orders</td></tr>';
    } else {
        html = purchaseOrdersData.map(po => `
            <tr>
                <td><strong>${po.id}</strong></td>
                <td>${po.product}</td>
                <td>${po.supplier}</td>
                <td>${po.qty}</td>
                <td>₹${po.cost.toLocaleString()}</td>
                <td><span class="badge ${po.status === 'received' ? 'badge-success' : 'badge-warning'}">${po.status}</span></td>
                <td>
                    <button class="btn btn-small btn-edit" onclick="viewPO('${po.id}')">View</button>
                    <button class="btn btn-small btn-danger" onclick="deletePO('${po.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    tbody.innerHTML = html;
}

/**
 * Update inventory table
 */
function updateInventoryTable() {
    const tbody = document.querySelector('#inventoryTable tbody');
    if (!tbody) return;

    let html = '';
    if (inventoryData.length === 0) {
        html = '<tr><td colspan="7" class="text-center">No inventory data</td></tr>';
    } else {
        html = inventoryData.map(inv => {
            const product = productsData.find(p => p.id === inv.productId);
            let statusBadge = 'badge-success';
            let statusText = 'Good';

            if (inv.quantity < inv.reorderLevel) {
                statusBadge = 'badge-danger';
                statusText = 'Low Stock';
            } else if (inv.quantity < inv.reorderLevel * 1.5) {
                statusBadge = 'badge-warning';
                statusText = 'Medium';
            }

            return `
                <tr>
                    <td><strong>${inv.product}</strong></td>
                    <td>${product ? product.category : 'N/A'}</td>
                    <td>${inv.quantity} units</td>
                    <td>${inv.reorderLevel} units</td>
                    <td>₹${product ? product.cost_price : '0'}</td>
                    <td>₹${product ? product.selling_price : '0'}</td>
                    <td><span class="badge ${statusBadge}">${statusText}</span></td>
                </tr>
            `;
        }).join('');
    }
    tbody.innerHTML = html;
}

/**
 * Update sales table
 */
function updateSalesTable() {
    const tbody = document.querySelector('#salesTable tbody');
    if (!tbody) return;

    let html = '';
    if (salesData.length === 0) {
        html = '<tr><td colspan="7" class="text-center">No sales data</td></tr>';
    } else {
        html = salesData.map(sale => `
            <tr>
                <td><strong>${sale.id}</strong></td>
                <td>${sale.customer}</td>
                <td>₹${sale.amount.toLocaleString()}</td>
                <td>${sale.payment}</td>
                <td><span class="badge ${sale.status === 'completed' ? 'badge-success' : 'badge-pending'}">${sale.status}</span></td>
                <td>${sale.date}</td>
                <td>
                    <button class="btn btn-small btn-edit" onclick="viewSale('${sale.id}')">View</button>
                    <button class="btn btn-small btn-danger" onclick="deleteSale('${sale.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    tbody.innerHTML = html;
}

/**
 * Update recent sales table
 */
function updateRecentSalesTable() {
    const tbody = document.querySelector('#recentSalesTable tbody');
    if (!tbody) return;

    const recent = salesData.slice(0, 5);
    let html = '';

    if (recent.length === 0) {
        html = '<tr><td colspan="5" class="text-center">No sales data</td></tr>';
    } else {
        html = recent.map(sale => `
            <tr>
                <td>${sale.id}</td>
                <td>${sale.customer}</td>
                <td>₹${sale.amount.toLocaleString()}</td>
                <td><span class="badge ${sale.status === 'completed' ? 'badge-success' : 'badge-pending'}">${sale.status}</span></td>
                <td>${sale.date}</td>
            </tr>
        `).join('');
    }
    tbody.innerHTML = html;
}

/**
 * Update daily summary
 */
function updateDailySummary() {
    const tbody = document.querySelector('#dailySummaryTable tbody');
    if (!tbody) return;

    const today = new Date().toLocaleDateString();
    const todaySales = salesData.filter(s => s.date === today);
    const totalAmount = todaySales.reduce((sum, s) => sum + s.amount, 0);

    let html = `
        <tr>
            <td><strong>${today}</strong></td>
            <td>₹${totalAmount.toLocaleString()}</td>
            <td>${todaySales.length}</td>
            <td>${todaySales.length}</td>
        </tr>
    `;
    tbody.innerHTML = html;
}

/**
 * Update profit/loss table
 */
function updateProfitLossTable() {
    const tbody = document.querySelector('#profitLossTable tbody');
    if (!tbody) return;

    const today = new Date().toLocaleDateString();
    const todaySales = salesData.filter(s => s.date === today);
    const totalRevenue = todaySales.reduce((sum, s) => sum + s.amount, 0);
    const totalCost = purchaseOrdersData.reduce((sum, po) => sum + (po.cost / po.qty) * 10, 0); // Simplified
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0;

    let html = `
        <tr>
            <td><strong>${today}</strong></td>
            <td>₹${totalRevenue.toLocaleString()}</td>
            <td>₹${Math.round(totalCost).toLocaleString()}</td>
            <td>₹${Math.round(profit).toLocaleString()}</td>
            <td>${margin}%</td>
        </tr>
    `;
    tbody.innerHTML = html;
}

// ========== MODAL FUNCTIONS ==========

/**
 * Open modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        populateModalSelects(modalId);
    }
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Populate modal select dropdowns
 */
function populateModalSelects(modalId) {
    if (modalId === 'purchaseOrderModal') {
        const supplierSelect = document.getElementById('poSupplier');
        const productSelect = document.getElementById('poProduct');

        if (supplierSelect) {
            supplierSelect.innerHTML = suppliersData.map(s => `<option value="${s.id}">${s.supplier_name}</option>`).join('');
        }
        if (productSelect) {
            productSelect.innerHTML = productsData.map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
        }
    } else if (modalId === 'adjustStockModal') {
        const productSelect = document.getElementById('adjustProduct');
        if (productSelect) {
            productSelect.innerHTML = productsData.map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
        }
    } else if (modalId === 'createSaleModal') {
        const productSelect = document.getElementById('saleProduct');
        if (productSelect) {
            productSelect.innerHTML = productsData.map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
        }
    }
}

// ========== FORM HANDLERS ==========

/**
 * Handle add supplier
 */
function handleAddSupplier(e) {
    e.preventDefault();

    const name = document.getElementById('supplierName').value.trim();
    const contact = document.getElementById('supplierContact').value.trim();
    const email = document.getElementById('supplierEmail').value.trim();
    const phone = document.getElementById('supplierPhone').value.trim();
    const city = document.getElementById('supplierCity').value.trim();

    if (!name) {
        alert('Supplier name is required');
        return;
    }

    const newSupplier = {
        id: 's' + Date.now(),
        supplier_name: name,
        contact_person: contact,
        email: email,
        phone: phone,
        city: city,
        status: 'active'
    };

    suppliersData.push(newSupplier);
    updateSuppliersTable();
    closeModal('suppliersModal');
    document.querySelector('#suppliersModal form').reset();
    showMessage('loginSuccess', '✓ Supplier added successfully!');
}

/**
 * Handle add product
 */
function handleAddProduct(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const costPrice = parseFloat(document.getElementById('productCostPrice').value);
    const sellingPrice = parseFloat(document.getElementById('productSellingPrice').value);

    if (!name || !costPrice || !sellingPrice) {
        alert('Product name, cost price, and selling price are required');
        return;
    }

    if (sellingPrice < costPrice) {
        alert('Selling price must be greater than cost price');
        return;
    }

    const newProduct = {
        id: 'p' + Date.now(),
        product_name: name,
        category: category || 'Uncategorized',
        cost_price: costPrice,
        selling_price: sellingPrice
    };

    productsData.push(newProduct);
    inventoryData.push({
        productId: newProduct.id,
        product: newProduct.product_name,
        quantity: 0,
        reorderLevel: 10
    });

    updateInventoryTable();
    closeModal('productsModal');
    document.querySelector('#productsModal form').reset();
    showMessage('loginSuccess', '✓ Product added successfully!');
}

/**
 * Handle create purchase order
 */
function handleCreatePO(e) {
    e.preventDefault();

    const supplierSelect = document.getElementById('poSupplier');
    const productSelect = document.getElementById('poProduct');
    const quantity = parseInt(document.getElementById('poQuantity').value);
    const unitCost = parseFloat(document.getElementById('poUnitCost').value);

    if (!supplierSelect.value || !productSelect.value || !quantity || !unitCost) {
        alert('All fields are required');
        return;
    }

    const supplier = suppliersData.find(s => s.id === supplierSelect.value);
    const product = productsData.find(p => p.id === productSelect.value);

    if (!supplier || !product) {
        alert('Invalid supplier or product');
        return;
    }

    const newPO = {
        id: 'po' + Date.now(),
        product: product.product_name,
        supplier: supplier.supplier_name,
        qty: quantity,
        cost: quantity * unitCost,
        status: 'pending'
    };

    purchaseOrdersData.push(newPO);
    updatePOTable();
    closeModal('purchaseOrderModal');
    document.querySelector('#purchaseOrderModal form').reset();
    showMessage('loginSuccess', '✓ Purchase Order created!');
}

/**
 * Handle stock adjustment
 */
function handleStockAdjustment(e) {
    e.preventDefault();

    const productId = document.getElementById('adjustProduct').value;
    const quantity = parseInt(document.getElementById('adjustQuantity').value);
    const reason = document.getElementById('adjustReason').value.trim();

    if (!productId || !quantity) {
        alert('Product and quantity are required');
        return;
    }

    const inventory = inventoryData.find(inv => inv.productId === productId);
    if (inventory) {
        inventory.quantity += quantity;
        updateInventoryTable();
        updateDashboardStats();
        closeModal('adjustStockModal');
        document.querySelector('#adjustStockModal form').reset();
        showMessage('loginSuccess', `✓ Stock adjusted by ${quantity}`);
    }
}

/**
 * Handle create sale
 */
function handleCreateSale(e) {
    e.preventDefault();

    const productSelect = document.getElementById('saleProduct');
    const quantity = parseInt(document.getElementById('saleQuantity').value);
    const paymentMethod = document.getElementById('salePaymentMethod').value;

    if (!productSelect.value || !quantity) {
        alert('Product and quantity are required');
        return;
    }

    const product = productsData.find(p => p.id === productSelect.value);
    if (!product) {
        alert('Invalid product');
        return;
    }

    const amount = product.selling_price * quantity;
    const inventory = inventoryData.find(inv => inv.productId === productSelect.value);

    if (!inventory || inventory.quantity < quantity) {
        alert('Insufficient stock!');
        return;
    }

    // Deduct from inventory
    inventory.quantity -= quantity;

    const newSale = {
        id: 'sale' + Date.now(),
        customer: 'Customer ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        amount: amount,
        payment: paymentMethod,
        status: 'completed',
        date: new Date().toLocaleDateString()
    };

    salesData.push(newSale);
    updateSalesTable();
    updateRecentSalesTable();
    updateDashboardStats();
    updateInventoryTable();
    updateProfitLossTable();
    closeModal('createSaleModal');
    document.querySelector('#createSaleModal form').reset();
    showMessage('loginSuccess', `✓ Sale created for ₹${amount}`);
}

// ========== DELETE FUNCTIONS ==========

/**
 * Delete supplier
 */
function deleteSupplier(id) {
    if (confirm('Are you sure you want to delete this supplier?')) {
        suppliersData = suppliersData.filter(s => s.id !== id);
        updateSuppliersTable();
        showMessage('loginSuccess', '✓ Supplier deleted!');
    }
}

/**
 * Delete purchase order
 */
function deletePO(id) {
    if (confirm('Are you sure you want to delete this purchase order?')) {
        purchaseOrdersData = purchaseOrdersData.filter(po => po.id !== id);
        updatePOTable();
        showMessage('loginSuccess', '✓ Purchase order deleted!');
    }
}

/**
 * Delete sale
 */
function deleteSale(id) {
    if (confirm('Are you sure you want to delete this sale?')) {
        salesData = salesData.filter(s => s.id !== id);
        updateSalesTable();
        updateRecentSalesTable();
        updateDashboardStats();
        showMessage('loginSuccess', '✓ Sale deleted!');
    }
}

// ========== VIEW FUNCTIONS ==========

/**
 * View purchase order details
 */
function viewPO(id) {
    const po = purchaseOrdersData.find(p => p.id === id);
    if (po) {
        alert(`PO Details:\n\nID: ${po.id}\nProduct: ${po.product}\nSupplier: ${po.supplier}\nQuantity: ${po.qty}\nTotal Cost: ₹${po.cost}\nStatus: ${po.status}`);
    }
}

/**
 * View sale details
 */
function viewSale(id) {
    const sale = salesData.find(s => s.id === id);
    if (sale) {
        alert(`Sale Details:\n\nID: ${sale.id}\nCustomer: ${sale.customer}\nAmount: ₹${sale.amount}\nPayment: ${sale.payment}\nStatus: ${sale.status}\nDate: ${sale.date}`);
    }
}

/**
 * Edit supplier
 */
function editSupplier(id) {
    const supplier = suppliersData.find(s => s.id === id);
    if (supplier) {
        document.getElementById('supplierName').value = supplier.supplier_name;
        document.getElementById('supplierContact').value = supplier.contact_person || '';
        document.getElementById('supplierEmail').value = supplier.email || '';
        document.getElementById('supplierPhone').value = supplier.phone || '';
        document.getElementById('supplierCity').value = supplier.city || '';
        openModal('suppliersModal');
    }
}

// ========== SEARCH & FILTER ==========

/**
 * Filter table rows
 */
function filterTable(tableId) {
    const searchId = tableId + 'Search';
    const searchInput = document.getElementById(searchId);

    if (!searchInput) return;

    const searchValue = searchInput.value.toLowerCase();
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Show message notification
 */
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
        setTimeout(() => {
            element.classList.remove('show');
        }, 4000);
    }
}

/**
 * Validate email format
 */
function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * Validate phone format
 */
function validatePhone(phone) {
    const pattern = /^[0-9]{10,15}$/;
    return pattern.test(phone.replace(/[^\d]/g, ''));
}

/**
 * Validate password strength
 */
function validatePassword(password) {
    if (password.length < 8) return false;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    return hasUppercase && hasNumber && hasSpecial;
}

// ========== CHARTS ==========

/**
 * Initialize all charts
 */
function initCharts() {
    initSalesChart();
    initProfitLossChart();
    initMonthlySalesChart();
    initProductChart();
}

/**
 * Sales trend chart
 */
function initSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (chartsInstance.salesChart) {
        chartsInstance.salesChart.destroy();
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [500, 700, 600, 1200, 800, 950, salesData.reduce((sum, s) => sum + s.amount, 0)];

    chartsInstance.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Daily Sales (₹)',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Profit/Loss chart
 */
function initProfitLossChart() {
    const ctx = document.getElementById('profitLossChart');
    if (!ctx) return;

    if (chartsInstance.profitChart) {
        chartsInstance.profitChart.destroy();
    }

    const totalRevenue = salesData.reduce((sum, s) => sum + s.amount, 0);
    const totalCost = purchaseOrdersData.reduce((sum, po) => sum + po.cost, 0);
    const profit = Math.max(totalRevenue - totalCost, 0);

    chartsInstance.profitChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Revenue', 'Cost', 'Profit'],
            datasets: [{
                data: [totalRevenue, totalCost, profit],
                backgroundColor: ['#4caf50', '#ff6b6b', '#667eea'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'bottom' }
            }
        }
    });
}

/**
 * Monthly sales chart
 */
function initMonthlySalesChart() {
    const ctx = document.getElementById('monthlySalesChart');
    if (!ctx) return;

    if (chartsInstance.monthlyChart) {
        chartsInstance.monthlyChart.destroy();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = [5000, 6000, 5500, 7000, 6500, salesData.reduce((sum, s) => sum + s.amount, 0)];

    chartsInstance.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Sales (₹)',
                data: data,
                backgroundColor: '#4facfe',
                borderColor: '#0d88ff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Top products chart
 */
function initProductChart() {
    const ctx = document.getElementById('productChart');
    if (!ctx) return;

    if (chartsInstance.productChart) {
        chartsInstance.productChart.destroy();
    }

    const topProducts = productsData.slice(0, 5);
    const labels = topProducts.map(p => p.product_name);
    const data = topProducts.map(() => Math.floor(Math.random() * 100) + 50);

    chartsInstance.productChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Units Sold',
                data: data,
                backgroundColor: '#764ba2',
                borderColor: '#5a3a7a',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// ========== WINDOW CLICK HANDLER ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};

console.log('✓ JavaScript loaded successfully');