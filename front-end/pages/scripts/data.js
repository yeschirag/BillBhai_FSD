/**
 * data.js - Core POS Data Store
 * Loads editable cashier catalog/promos from JSON and persists created orders.
 */

const DataStore = (() => {
    'use strict';

    const STORAGE_KEY = 'bb_pos_orders';
    const CASHIER_DATA_PATH = 'data/cashier_data.json';

    const DEFAULT_CATALOG = [
        { id: 'P001', name: 'Basmati Rice', category: 'Groceries', image: 'R', options: [{ label: '1kg', price: 85 }, { label: '2kg', price: 160 }, { label: '5kg', price: 380 }] },
        { id: 'P002', name: 'Toor Dal', category: 'Groceries', image: 'D', options: [{ label: '500g', price: 65 }, { label: '1kg', price: 120 }, { label: '2kg', price: 230 }] },
        { id: 'P003', name: 'Refined Oil', category: 'Groceries', image: 'O', options: [{ label: '500ml', price: 80 }, { label: '1L', price: 155 }, { label: '5L', price: 750 }] },
        { id: 'P004', name: 'Amul Butter', category: 'Dairy', image: 'B', options: [{ label: '100g', price: 60 }, { label: '500g', price: 275 }] },
        { id: 'P005', name: 'Milk', category: 'Dairy', image: 'M', options: [{ label: '500ml', price: 32 }, { label: '1L', price: 60 }] },
        { id: 'P006', name: 'Bread Loaf', category: 'Snacks', image: 'L', options: [{ label: 'Regular', price: 45 }, { label: 'Family Pack', price: 80 }] },
        { id: 'P007', name: 'Maggi Noodles', category: 'Snacks', image: 'N', options: [{ label: 'Single', price: 14 }, { label: 'Pack of 4', price: 54 }, { label: 'Pack of 12', price: 168 }] },
        { id: 'P008', name: 'Tea Powder', category: 'Beverages', image: 'T', options: [{ label: '250g', price: 160 }, { label: '500g', price: 310 }] },
        { id: 'P009', name: 'Coffee Jar', category: 'Beverages', image: 'C', options: [{ label: '50g', price: 95 }, { label: '100g', price: 180 }] }
    ];

    const DEFAULT_PROMOS = {
        WELCOME10: { type: 'percent', value: 10 },
        FLAT50: { type: 'fixed', value: 50 }
    };

    let catalog = clone(DEFAULT_CATALOG);
    let promos = { ...DEFAULT_PROMOS };
    let orders = [];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    async function loadCashierDataFromJson() {
        try {
            const response = await fetch(CASHIER_DATA_PATH, { cache: 'no-store' });
            if (!response.ok) return;

            const parsed = await response.json();
            if (!parsed || typeof parsed !== 'object') return;

            if (Array.isArray(parsed.catalog) && parsed.catalog.length) {
                catalog = clone(parsed.catalog);
            }

            if (parsed.promos && typeof parsed.promos === 'object' && !Array.isArray(parsed.promos)) {
                promos = { ...parsed.promos };
            }
        } catch (err) {
            // Keep fallback defaults when JSON is unavailable.
        }
    }

    async function init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) orders = parsed;
            }
        } catch (err) {
            orders = [];
        }

        await loadCashierDataFromJson();
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }

    function getCategories() {
        const cats = new Set(catalog.map(p => p.category));
        return ['All', ...Array.from(cats)];
    }

    function searchCatalog(query, category) {
        let results = catalog;
        if (category && category !== 'All') {
            results = results.filter(p => p.category === category);
        }
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(p =>
                String(p.name || '').toLowerCase().includes(q) ||
                String(p.category || '').toLowerCase().includes(q)
            );
        }
        return results;
    }

    function applyPromo(code, subtotal) {
        if (!code) return { active: false, discount: 0 };
        const upper = code.trim().toUpperCase();
        if (!promos[upper]) return { active: false, discount: 0, error: 'Invalid code' };

        const promo = promos[upper];
        let discount = 0;
        if (promo.type === 'percent') {
            discount = (subtotal * promo.value) / 100;
        } else if (promo.type === 'fixed') {
            discount = promo.value;
        }

        if (discount > subtotal) discount = subtotal;
        return { active: true, code: upper, discount };
    }

    function generateId() {
        return 'ORD-' + (orders.length + 5001 + Date.now().toString().slice(-3));
    }

    function createOrder(customerData, cartItems, discountApplied) {
        const order = {
            id: generateId(),
            customer: customerData.name,
            phone: customerData.phone,
            items: cartItems.map(c => ({
                id: c.id,
                name: c.name,
                price: c.price,
                qty: c.qty
            })),
            subtotal: cartItems.reduce((sum, c) => sum + (c.price * c.qty), 0),
            discount: discountApplied.active ? discountApplied.discount : 0,
            promoCode: discountApplied.active ? discountApplied.code : null,
            total: 0,
            status: 'Processing',
            paymentMethod: 'Awaiting Gateway',
            date: new Date().toISOString()
        };

        order.total = order.subtotal - order.discount;
        orders.unshift(order);
        save();
        return order;
    }

    return {
        init,
        getCategories,
        searchCatalog,
        applyPromo,
        createOrder
    };
})();
