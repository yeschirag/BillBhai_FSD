/**
 * data.js — Core POS Mock Data
 * Houses products, discount codes, and order persistence.
 */

const DataStore = (() => {
    'use strict';
    
    const STORAGE_KEY = 'bb_pos_orders';

    // ── Catalog Data ─────────────────────────────────────────────────────
    const catalog = [
        { id: 'P001', name: 'Basmati Rice (5kg)', category: 'Groceries', price: 380, image: '🛒' },
        { id: 'P002', name: 'Toor Dal (1kg)', category: 'Groceries', price: 120, image: '🌾' },
        { id: 'P003', name: 'Refined Oil (1L)', category: 'Groceries', price: 155, image: '🛢️' },
        { id: 'P004', name: 'Amul Butter (500g)', category: 'Dairy', price: 275, image: '🧈' },
        { id: 'P005', name: 'Milk (1L)', category: 'Dairy', price: 60, image: '🥛' },
        { id: 'P006', name: 'Bread Loaf', category: 'Snacks', price: 45, image: '🍞' },
        { id: 'P007', name: 'Maggi Noodles (Pack)', category: 'Snacks', price: 168, image: '🍜' },
        { id: 'P008', name: 'Tea Powder (500g)', category: 'Beverages', price: 310, image: '🫖' },
        { id: 'P009', name: 'Coffee Jar (100g)', category: 'Beverages', price: 180, image: '☕' }
    ];

    // ── Discount Codes ───────────────────────────────────────────────────
    const promos = {
        'WELCOME10': { type: 'percent', value: 10 },
        'FLAT50': { type: 'fixed', value: 50 }
    };

    let orders = [];

    // ── Init & Storage ───────────────────────────────────────────────────
    function init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) orders = JSON.parse(raw);
        } catch(e) {}
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }

    // ── Catalog APIs ─────────────────────────────────────────────────────
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
                p.name.toLowerCase().includes(q) || 
                p.category.toLowerCase().includes(q)
            );
        }
        return results;
    }

    // ── Cart Math ────────────────────────────────────────────────────────
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
        
        // Cannot discount more than subtotal
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
                id: c.id, name: c.name, price: c.price, qty: c.qty
            })),
            subtotal: cartItems.reduce((s, c) => s + (c.price * c.qty), 0),
            discount: discountApplied.active ? discountApplied.discount : 0,
            promoCode: discountApplied.active ? discountApplied.code : null,
            total: 0, // calculated below
            status: 'Processing',
            paymentMethod: 'Awaiting Gateway', // Replaced upon gateway return
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
