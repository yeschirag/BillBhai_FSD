document.addEventListener('DOMContentLoaded', () => {
    function updateLogos() {
        const isLight = document.body.classList.contains('light-mode');
        const sidebarLogo = document.querySelector('.sidebar-brand-img');
        if (sidebarLogo) sidebarLogo.src = isLight ? 'logo.png' : 'logo-dark.png';
    }

    // ── THEME SYNC ────────────────────────────────────────────────────────
    if (localStorage.getItem('billbhai-theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    updateLogos();

    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('billbhai-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        updateLogos();
        updateAllCharts();
    });

    // ── HEADER DROPDOWNS & SEARCH ─────────────────────────────────────────
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const globalSearch = document.getElementById('globalSearch');

    function closeDropdowns() {
        if (notifDropdown) notifDropdown.classList.remove('show');
        if (userDropdown) userDropdown.classList.remove('show');
    }

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = notifDropdown.classList.contains('show');
            closeDropdowns();
            if (!isShowing) notifDropdown.classList.add('show');
        });
    }

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = userDropdown.classList.contains('show');
            closeDropdowns();
            if (!isShowing) userDropdown.classList.add('show');
        });
    }

    document.addEventListener('click', () => {
        closeDropdowns();
    });

    if (globalSearch) {
        globalSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && globalSearch.value.trim() !== '') {
                alert(`Search functionality for "${globalSearch.value.trim()}" is not implemented yet.`);
                globalSearch.value = '';
            }
        });
    }

    // ── NAVIGATION & SIDEBAR ──────────────────────────────────────────────
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const bcPage = document.getElementById('bcPage');
    const content = document.getElementById('contentArea');

    menuToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
        else sidebar.classList.toggle('collapsed');
    });
    overlay.addEventListener('click', () => sidebar.classList.remove('mobile-open'));

    let currentPage = 'dashboard';

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            currentPage = item.dataset.page;

            const span = item.querySelector('span');
            bcPage.textContent = span ? span.textContent : item.textContent.trim();

            if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
            renderPage(currentPage);
        });
    });

    // ── DATA ──────────────────────────────────────────────────────────────
    const orders = [
        { id: 'ORD-4821', customer: 'Rahul Sharma', items: 3, total: 1250, payment: 'UPI', status: 'Delivered', date: '17 Feb 14:32' },
        { id: 'ORD-4820', customer: 'Priya Patel', items: 1, total: 450, payment: 'Cash', status: 'Processing', date: '17 Feb 13:45' },
        { id: 'ORD-4819', customer: 'Amit Kumar', items: 5, total: 3200, payment: 'Card', status: 'Delivered', date: '17 Feb 12:10' },
        { id: 'ORD-4818', customer: 'Sneha Gupta', items: 2, total: 890, payment: 'UPI', status: 'Pending', date: '17 Feb 11:50' },
        { id: 'ORD-4817', customer: 'Vikram Joshi', items: 4, total: 2100, payment: 'Cash', status: 'Delivered', date: '16 Feb 18:22' },
        { id: 'ORD-4816', customer: 'Neha Reddy', items: 1, total: 320, payment: 'UPI', status: 'Cancelled', date: '16 Feb 17:05' },
        { id: 'ORD-4815', customer: 'Karan Mehta', items: 6, total: 4750, payment: 'Card', status: 'Processing', date: '16 Feb 15:30' },
        { id: 'ORD-4814', customer: 'Anjali Desai', items: 2, total: 1100, payment: 'Cash', status: 'Delivered', date: '16 Feb 14:15' },
        { id: 'ORD-4813', customer: 'Rohan Verma', items: 3, total: 1680, payment: 'UPI', status: 'Delivered', date: '15 Feb 19:40' },
        { id: 'ORD-4812', customer: 'Divya Nair', items: 1, total: 560, payment: 'Card', status: 'Pending', date: '15 Feb 16:55' }
    ];

    const inventory = [
        { sku: 'SKU-01', name: 'Basmati Rice', cat: 'Grocery', stock: 145, price: 380, status: 'In Stock' },
        { sku: 'SKU-02', name: 'Toor Dal', cat: 'Grocery', stock: 230, price: 120, status: 'In Stock' },
        { sku: 'SKU-03', name: 'Refined Oil', cat: 'Grocery', stock: 18, price: 155, status: 'Low Stock' },
        { sku: 'SKU-04', name: 'Wheat Flour', cat: 'Grocery', stock: 95, price: 420, status: 'In Stock' },
        { sku: 'SKU-05', name: 'Sugar', cat: 'Grocery', stock: 5, price: 210, status: 'Critical' },
        { sku: 'SKU-06', name: 'Milk', cat: 'Dairy', stock: 320, price: 56, status: 'In Stock' },
        { sku: 'SKU-07', name: 'Curd', cat: 'Dairy', stock: 85, price: 35, status: 'In Stock' },
        { sku: 'SKU-08', name: 'Paneer', cat: 'Dairy', stock: 12, price: 80, status: 'Low Stock' },
        { sku: 'SKU-09', name: 'Tea', cat: 'Beverages', stock: 110, price: 180, status: 'In Stock' },
        { sku: 'SKU-10', name: 'Coffee', cat: 'Beverages', stock: 8, price: 320, status: 'Critical' }
    ];

    const deliveries = [
        { id: 'DEL-901', oid: 'ORD-4821', partner: 'Rajesh K.', status: 'Delivered', time: '14:10' },
        { id: 'DEL-900', oid: 'ORD-4820', partner: 'Sunil M.', status: 'Out for Delivery', time: '-' },
        { id: 'DEL-899', oid: 'ORD-4819', partner: 'Deepak R.', status: 'Delivered', time: '12:05' },
        { id: 'DEL-898', oid: 'ORD-4818', partner: '-', status: 'Pending Dispatch', time: '-' },
        { id: 'DEL-897', oid: 'ORD-4817', partner: 'Amit S.', status: 'Delivered', time: '18:00' }
    ];

    const returns = [
        { id: 'RET-201', oid: 'ORD-4810', reason: 'Damaged', amount: 420, status: 'Approved' },
        { id: 'RET-200', oid: 'ORD-4805', reason: 'Wrong Item', amount: 155, status: 'Refunded' },
        { id: 'RET-199', oid: 'ORD-4798', reason: 'Expired', amount: 80, status: 'Approved' },
        { id: 'RET-198', oid: 'ORD-4792', reason: 'Stale', amount: 45, status: 'Rejected' }
    ];

    const users = [
        { name: 'Admin', role: 'Ops Head', status: 'Active' },
        { name: 'Ramesh Gupta', role: 'Cashier', status: 'Active' },
        { name: 'Sunita Verma', role: 'Cashier', status: 'Active' },
        { name: 'Deepak Singh', role: 'Manager', status: 'Active' },
        { name: 'David Lee', role: 'Support', status: 'Offline' }
    ];

    const notificationsList = [
        {
            id: 'NOTIF-001',
            title: 'New Order #4821 Received',
            type: 'order',
            time: '2 mins ago',
            desc: 'Order contains 3 items. Total: ₹1250 (Paid via UPI).',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>',
            color: 'blue',
            changes: [
                { file: 'orders/status', old: 'Pending', new: 'Processing' },
                { file: 'payment/log', old: 'null', new: 'Transaction #TXN-89A (UPI)' }
            ]
        },
        {
            id: 'NOTIF-002',
            title: 'Low Stock Alert: Sugar',
            type: 'alert',
            time: '1 hour ago',
            desc: 'SKU-05 stock level has fallen below threshold. Current stock: 5 units.',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
            color: 'red',
            changes: [
                { file: 'inventory/SKU-05/quantity', old: '15', new: '5' },
                { file: 'inventory/SKU-05/status', old: 'In Stock', new: 'Low Stock' }
            ]
        },
        {
            id: 'NOTIF-003',
            title: 'Database Backup Completed',
            type: 'system',
            time: 'Yesterday',
            desc: 'Automated weekly backup was successful.',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            color: 'green',
            changes: [
                { file: 'system/backups/latest', old: 'backup_2026-02-10.sql', new: 'backup_2026-02-17.sql' },
                { file: 'system/storage/used', old: '4.2 GB', new: '4.3 GB' }
            ]
        }
    ];

    // ── HELPERS ───────────────────────────────────────────────────────────
    function badge(txt, type) { return `<span class="badge b-${type}">${txt}</span>`; }
    function statusBadge(s) { return badge(s, s.toLowerCase().replace(/ /g, '')); }
    function table(hdrs, rows) { return `<div class="tbl-wrap"><table class="dt"><thead><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`; }

    // ── PAGE RENDERERS ────────────────────────────────────────────────────
    let activeCharts = []; // Track active charts for cleanup

    function renderPage(page) {
        content.innerHTML = '';
        // Cleanup existing charts
        if (activeCharts.length) {
            activeCharts.forEach(c => c.destroy());
            activeCharts = [];
        }

        const renderers = {
            dashboard: renderDashboard, orders: renderOrders, inventory: renderInventory,
            delivery: renderDelivery, returns: renderReturns, reports: renderReports, users: renderUsers,
            profile: renderProfile, settings: renderSettings, notifications: renderNotifications
        };
        if (renderers[page]) renderers[page]();
        content.scrollTop = 0;
    }

    window.renderUserProfile = renderUserProfile;
    window.renderNotificationDetail = renderNotificationDetail;

    function renderDashboard() {
        const totalSales = orders.reduce((a, o) => a + o.total, 0);
        content.innerHTML = `
        <div class="page-header"><h2>Dashboard</h2><div class="page-header-actions"><button class="btn btn-outline" onclick="window.print()">Print</button></div></div>
        <section class="stats-grid">
            <div class="stat-card"><div class="stat-icon si-green"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="stat-info"><span class="stat-label">Revenue</span><span class="stat-value">₹${totalSales.toLocaleString()}</span></div></div>
            <div class="stat-card"><div class="stat-icon si-blue"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg></div><div class="stat-info"><span class="stat-label">Orders</span><span class="stat-value">${orders.length}</span></div></div>
            <div class="stat-card"><div class="stat-icon si-red"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></div><div class="stat-info"><span class="stat-label">Returns</span><span class="stat-value">${returns.length}</span></div></div>
            <div class="stat-card"><div class="stat-icon si-amber"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div><div class="stat-info"><span class="stat-label">Alerts</span><span class="stat-value">${inventory.filter(i => i.status !== 'In Stock').length}</span></div></div>
        </section>
        <section class="grid-2">
            <div class="card"><div class="card-hd"><h3>Sales Trend</h3></div><div class="card-bd" style="position:relative;height:240px"><canvas id="dashSalesChart"></canvas></div></div>
            <div class="card"><div class="card-hd"><h3>Order Status</h3></div><div class="card-bd" style="position:relative;height:240px"><canvas id="dashStatusChart"></canvas></div></div>
        </section>
        <section class="card"><div class="card-hd"><h3>Recent Orders</h3></div><div class="card-bd">${table(
            ['ID', 'Customer', 'Total', 'Payment', 'Status'],
            orders.slice(0, 5).map(o => `<tr><td class="cell-main">${o.id}</td><td>${o.customer}</td><td>₹${o.total}</td><td>${badge(o.payment, o.payment.toLowerCase())}</td><td>${statusBadge(o.status)}</td></tr>`).join('')
        )}</div></section>`;
        setTimeout(initDashboardCharts, 0);
    }

    function renderOrders() {
        content.innerHTML = `
        <div class="page-header"><h2>Orders</h2><div class="page-header-actions"><button class="btn btn-primary">New Order</button></div></div>
        <section class="card"><div class="card-bd">${table(
            ['ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date'],
            orders.map(o => `<tr><td class="cell-main">${o.id}</td><td>${o.customer}</td><td>${o.items}</td><td>₹${o.total}</td><td>${badge(o.payment, o.payment.toLowerCase())}</td><td>${statusBadge(o.status)}</td><td>${o.date}</td></tr>`).join('')
        )}</div></section>`;
    }

    function renderInventory() {
        content.innerHTML = `
        <div class="page-header"><h2>Inventory</h2></div>
        <section class="grid-2">
             <div class="card"><div class="card-hd"><h3>Category Distribution</h3></div><div class="card-bd" style="position:relative;height:220px"><canvas id="invCatChart"></canvas></div></div>
             <div class="card"><div class="card-hd"><h3>Stock Levels</h3></div><div class="card-bd" style="position:relative;height:220px"><canvas id="invStockChart"></canvas></div></div>
        </section>
        <section class="card"><div class="card-bd">${table(
            ['SKU', 'Product', 'Category', 'Stock', 'Unit Price', 'Status'],
            inventory.map(i => `<tr><td class="cell-main">${i.sku}</td><td>${i.name}</td><td>${i.cat}</td><td>${i.stock}</td><td>₹${i.price}</td><td>${statusBadge(i.status)}</td></tr>`).join('')
        )}</div></section>`;
        setTimeout(initInventoryCharts, 0);
    }

    function renderDelivery() {
        content.innerHTML = `
        <div class="page-header"><h2>Delivery</h2></div>
        <section class="card"><div class="card-bd">${table(['ID', 'Order', 'Partner', 'Status', 'Time'], deliveries.map(d => `<tr><td class="cell-main">${d.id}</td><td>${d.oid}</td><td>${d.partner}</td><td>${statusBadge(d.status)}</td><td>${d.time}</td></tr>`).join(''))}</div></section>`;
    }

    function renderReturns() {
        content.innerHTML = `
        <div class="page-header"><h2>Returns</h2></div>
        <section class="grid-2">
            <div class="card"><div class="card-hd"><h3>Return Reasons</h3></div><div class="card-bd" style="position:relative;height:200px"><canvas id="retReasonChart"></canvas></div></div>
            <div class="card"><div class="card-hd"><h3>Status Breakdown</h3></div><div class="card-bd" style="position:relative;height:200px"><canvas id="retStatusChart"></canvas></div></div>
        </section>
        <section class="card"><div class="card-bd">${table(['ID', 'Order', 'Reason', 'Amount', 'Status'], returns.map(r => `<tr><td class="cell-main">${r.id}</td><td>${r.oid}</td><td>${r.reason}</td><td>₹${r.amount}</td><td>${statusBadge(r.status)}</td></tr>`).join(''))}</div></section>`;
        setTimeout(initReturnCharts, 0);
    }

    function renderReports() {
        content.innerHTML = `
        <div class="page-header"><h2>Reports</h2></div>
        <section class="card"><div class="card-hd"><h3>Monthly Revenue (Projected)</h3></div><div class="card-bd" style="position:relative;height:300px"><canvas id="repRevChart"></canvas></div></section>`;
        setTimeout(initReportCharts, 0);
    }

    function renderUsers() {
        content.innerHTML = `
        <div class="page-header"><h2>Users</h2><div class="page-header-actions"><button class="btn btn-primary">Add User</button></div></div>
        <section class="card"><div class="card-bd">${table(['Name', 'Role', 'Status', 'Actions'], users.map(u => `<tr><td class="cell-main">${u.name}</td><td>${u.role}</td><td>${statusBadge(u.status)}</td><td><button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="renderUserProfile('${u.name}')">View</button></td></tr>`).join(''))}</div></section>`;
    }

    function renderUserProfile(username) {
        const user = users.find(u => u.name === username);
        if (!user) return;

        const initial = user.name.charAt(0).toUpperCase();
        const email = user.name.toLowerCase().replace(' ', '.') + '@billbhai.com';

        let activityHtml = '';
        if (user.role === 'Delivery') {
            activityHtml = `
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Today, 11:30</div><div class="timeline-content">Delivered Order <strong>#ORD-4819</strong></div></div>
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Today, 09:15</div><div class="timeline-content">Out for delivery with 4 orders</div></div>
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Yesterday, 17:00</div><div class="timeline-content">Finished shift</div></div>`;
        } else if (user.role === 'Sales') {
            activityHtml = `
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Today, 14:02</div><div class="timeline-content">Created Order <strong>#ORD-4821</strong> for ₹1250</div></div>
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Yesterday, 16:45</div><div class="timeline-content">Processed Return <strong>#RET-201</strong></div></div>
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Yesterday, 10:30</div><div class="timeline-content">Logged in</div></div>`;
        } else {
            activityHtml = `
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">Today, 10:12</div><div class="timeline-content">Updated inventory stock for <strong>SKU-05</strong></div></div>
             <div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-time">14 Feb, 09:00</div><div class="timeline-content">System login</div></div>`;
        }

        content.innerHTML = `
        <div class="page-header" style="justify-content: flex-start; gap: 16px;">
            <button class="btn btn-outline" style="padding: 8px;" onclick="document.querySelector('.nav-item[data-page=\\'users\\']').click()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
            <h2>User Details</h2>
        </div>
        <section class="grid-2">
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div class="card">
                    <div class="card-bd" style="text-align: center; padding-top: 30px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), var(--amber)); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; font-weight: 700;">${initial}</div>
                        <h3 style="font-size: 1.2rem; margin-bottom: 4px;">${user.name}</h3>
                        <p class="text-muted" style="margin-bottom: 8px;">${user.role} • ${email}</p>
                        <div style="margin-bottom: 20px;">${statusBadge(user.status)}</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-hd"><h3 style="color: var(--red);">Admin Actions</h3></div>
                    <div class="card-bd" style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="btn btn-outline" style="justify-content: center;">Change User Role</button>
                        <button class="btn btn-outline" style="justify-content: center;">Send Password Reset Link</button>
                        <button class="btn" style="justify-content: center; background: rgba(220, 53, 69, 0.1); color: var(--red); border: 1px solid rgba(220, 53, 69, 0.3);">Suspend Account</button>
                        <button class="btn" style="justify-content: center; background: var(--red-bg); color: var(--red); border: 1px solid var(--red);">Delete User</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-hd"><h3>Recent Activity</h3></div>
                <div class="card-bd">
                    <div class="timeline">
                        ${activityHtml}
                    </div>
                </div>
            </div>
        </section>`;
    }

    function renderProfile() {
        content.innerHTML = `
        <div class="page-header"><h2>My Profile</h2></div>
        <section class="grid-2">
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div class="card">
                    <div class="card-bd" style="text-align: center; padding-top: 30px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--amber)); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; font-weight: 700;">A</div>
                        <h3 style="font-size: 1.2rem; margin-bottom: 4px;">Admin Demo</h3>
                        <p class="text-muted" style="margin-bottom: 20px;">Head of Ops • admindemo@billbhai.com</p>
                        <button class="btn btn-outline" style="width: 100%; justify-content: center;">Edit Profile</button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-hd"><h3>Security</h3></div>
                    <div class="card-bd">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" class="form-control" placeholder="••••••••">
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" class="form-control" placeholder="••••••••">
                        </div>
                        <button class="btn btn-primary" style="width: 100%; justify-content: center;">Update Password</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-hd"><h3>Recent Activity</h3></div>
                <div class="card-bd">
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">Today, 14:30</div>
                            <div class="timeline-content">Approved Return <strong>#RET-201</strong></div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">Yesterday, 18:45</div>
                            <div class="timeline-content">Generated Monthly Sales Report</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">15 Feb, 09:12</div>
                            <div class="timeline-content">Updated inventory stock for <strong>SKU-05</strong></div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">14 Feb, 10:00</div>
                            <div class="timeline-content">System login from new IP Address</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    function renderSettings() {
        content.innerHTML = `
        <div class="page-header"><h2>Settings</h2><div class="page-header-actions"><button class="btn btn-primary">Save Changes</button></div></div>
        <section class="card" style="padding: 20px;">
            <div class="settings-layout">
                <div class="settings-nav">
                    <button class="settings-tab active"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> General</button>
                    <button class="settings-tab"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Store Details</button>
                    <button class="settings-tab"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Notifications</button>
                </div>
                <div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 20px;">General Preferences</h3>
                    <div class="form-group" style="max-width: 400px;">
                        <label class="form-label">Language</label>
                        <select class="form-control"><option>English (US)</option><option>Hindi</option></select>
                    </div>
                    <div class="form-group" style="max-width: 400px;">
                        <label class="form-label">Currency Symbol</label>
                        <select class="form-control"><option>₹ (INR)</option><option>$ (USD)</option></select>
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 400px;">
                            <div>
                                <div style="font-weight: 500;">Two-Factor Authentication</div>
                                <div class="text-sm text-muted">Require 2FA for all admin logins</div>
                            </div>
                            <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    function renderNotifications() {
        content.innerHTML = `
        <div class="page-header"><h2>Notifications</h2><div class="page-header-actions"><button class="btn btn-outline">Mark all as read</button></div></div>
        <div class="card">
            <div class="card-hd" style="padding: 0;">
                <div style="display: flex; border-bottom: 1px solid var(--border);">
                    <button style="padding: 14px 20px; border: none; background: none; color: var(--accent); border-bottom: 2px solid var(--accent); font-weight: 600; cursor: pointer;">All</button>
                    <button style="padding: 14px 20px; border: none; background: none; color: var(--text-muted); font-weight: 500; cursor: pointer;">Unread</button>
                </div>
            </div>
            <div class="card-bd" style="padding: 0;">
                ${notificationsList.map(n => `
                <div class="notif-item" onclick="renderNotificationDetail('${n.id}')" style="display: flex; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--border); align-items: flex-start; cursor: pointer; transition: background 0.2s;">
                    <div style="background: var(--${n.color}-bg); color: var(--${n.color}); padding: 10px; border-radius: 8px; flex-shrink: 0;">${n.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-primary); transition: color 0.2s;">${n.title}</div>
                        <div class="text-sm text-muted" style="margin-top: 2px;">${n.desc}</div>
                    </div>
                    <div class="text-sm text-muted">${n.time}</div>
                </div>`).join('')}
            </div>
        </div>`;
    }

    function renderNotificationDetail(id) {
        const n = notificationsList.find(x => x.id === id);
        if (!n) return;

        let diffHtml = '';
        n.changes.forEach(c => {
            diffHtml += `
            <div style="margin-bottom: 24px;">
                <div style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--border);">
                    File: <strong>${c.file}</strong>
                </div>
                <div class="diff-view">
                    <div class="diff-line removed">- ${c.old}</div>
                    <div class="diff-line added">+ ${c.new}</div>
                </div>
            </div>`;
        });

        content.innerHTML = `
        <div class="page-header" style="justify-content: flex-start; gap: 16px;">
            <button class="btn btn-outline" style="padding: 8px;" onclick="document.querySelector('.nav-item[data-page=\\'notifications\\']').click()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
            <h2>Event Details</h2>
        </div>
        <div class="card" style="margin-bottom: 24px;">
            <div class="card-bd" style="display: flex; gap: 16px; align-items: flex-start;">
                <div style="background: var(--${n.color}-bg); color: var(--${n.color}); padding: 14px; border-radius: 8px; flex-shrink: 0;">${n.icon}</div>
                <div>
                    <h3 style="margin-bottom: 4px; font-size: 1.2rem;">${n.title}</h3>
                    <div style="color: var(--text-muted); margin-bottom: 12px;">ID: ${n.id} • ${n.time}</div>
                    <p style="color: var(--text-primary);">${n.desc}</p>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-hd"><h3>System Changes (Diff)</h3></div>
            <div class="card-bd" style="background: #1e1e1e; border-radius: 0 0 var(--radius) var(--radius); padding: 24px;">
                ${diffHtml}
            </div>
        </div>`;
    }



    function getColors() {
        const isLight = document.body.classList.contains('light-mode');
        return {
            text: isLight ? '#1a1a2e' : '#f0f0f0',
            grid: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
            red: '#dc3545', amber: '#e8a838', blue: '#64b5f6', green: '#51cf66', purple: '#bf5af2'
        };
    }

    function createChart(id, type, data, options) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        const c = getColors();
        // Merge default styling
        const defaults = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: c.text } } },
            scales: type !== 'pie' && type !== 'doughnut' ? {
                x: { grid: { color: c.grid, display: false }, ticks: { color: c.text } },
                y: { grid: { color: c.grid }, ticks: { color: c.text } }
            } : {}
        };
        const chart = new Chart(ctx, { type, data, options: { ...defaults, ...options } });
        activeCharts.push(chart);
    }

    function initDashboardCharts() {
        const c = getColors();
        createChart('dashSalesChart', 'line', {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ label: 'Revenue', data: [12500, 15000, 11000, 18000, 22000, 24580, 21000], borderColor: c.red, backgroundColor: 'rgba(220,53,69,0.1)', tension: 0.4, fill: true }]
        });
        createChart('dashStatusChart', 'doughnut', {
            labels: ['Delivered', 'Processing', 'Returns'],
            datasets: [{ data: [65, 25, 10], backgroundColor: [c.green, c.blue, c.red], borderWidth: 0 }]
        }, { plugins: { legend: { position: 'right', labels: { color: c.text } } } });
    }

    function initInventoryCharts() {
        const c = getColors();
        createChart('invCatChart', 'pie', {
            labels: ['Grocery', 'Dairy', 'Beverages'],
            datasets: [{ data: [5, 3, 2], backgroundColor: [c.amber, c.blue, c.green], borderWidth: 0 }]
        }, { plugins: { legend: { position: 'right', labels: { color: c.text } } } });

        createChart('invStockChart', 'bar', {
            labels: ['Rice', 'Dal', 'Oil', 'Flour', 'Sugar'],
            datasets: [{ label: 'Stock Level', data: [145, 230, 18, 95, 5], backgroundColor: [c.green, c.green, c.red, c.green, c.red] }]
        });
    }

    function initReturnCharts() {
        const c = getColors();
        createChart('retReasonChart', 'bar', {
            labels: ['Damaged', 'Wrong Item', 'Expired', 'Stale'],
            datasets: [{ label: 'Count', data: [5, 3, 2, 1], backgroundColor: c.red }]
        }, { indexAxis: 'y' });

        createChart('retStatusChart', 'doughnut', {
            labels: ['Approved', 'Refunded', 'Rejected'],
            datasets: [{ data: [4, 2, 1], backgroundColor: [c.green, c.blue, c.red], borderWidth: 0 }]
        }, { plugins: { legend: { position: 'right', labels: { color: c.text } } } });
    }

    function initReportCharts() {
        const c = getColors();
        createChart('repRevChart', 'line', {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ label: 'Projected Revenue', data: [120000, 145000, 138000, 160000], borderColor: c.blue, backgroundColor: 'rgba(100,181,246,0.1)', fill: true }]
        });
    }

    function updateAllCharts() {
        const p = currentPage;
        renderPage(p); // Re-render page to cleanup and redraw charts with new colors
    }

    // Init
    renderPage('dashboard');
});
