/**
 * ui.js — POS Grid & Wizard DOM Manager
 */

const UI = (() => {
    'use strict';

    let el = {};
    let cart = [];
    let currentDiscount = { active: false, discount: 0 };
    let currentCategory = 'All';
    let searchQuery = '';

    let callbacks = { onCheckout: null };

    // Set up elements
    function cacheElements() {
        el = {
            step1: document.getElementById('step-1-customer'),
            step2: document.getElementById('step-2-pos'),
            step3: document.getElementById('step-3-payment'),

            // Step 1 Form
            custForm: document.getElementById('customerForm'),
            inpName: document.getElementById('cName'),
            inpPhone: document.getElementById('cPhone'),
            errName: document.getElementById('errName'),
            errPhone: document.getElementById('errPhone'),

            // Step 2 Catalog
            catList: document.getElementById('categoryFilters'),
            searchInp: document.getElementById('posSearch'),
            prodGrid: document.getElementById('productGrid'),

            // Step 2 Cart Sidebar
            cartList: document.getElementById('cartItemsList'),
            subSpan: document.getElementById('subSpan'),
            discSpan: document.getElementById('discSpan'),
            totSpan: document.getElementById('totSpan'),
            btnCheckout: document.getElementById('btnCheckout'),

            // Step 2 Discount
            inpPromo: document.getElementById('promoCode'),
            btnPromo: document.getElementById('applyPromoBtn'),
            errPromo: document.getElementById('promoError'),
            promoInputBlock:  document.getElementById('promoInputBlock'),
            promoAppliedTag:  document.getElementById('promoAppliedTag'),
            promoAppliedCode: document.getElementById('promoAppliedCode'),
            btnRemovePromo:   document.getElementById('removePromoBtn'),

            // Step 3 Actions
            btnReset: document.getElementById('btnResetFlow')
        };
    }

    // ── Navigation ────────────────────────────────────────────────────────
    function showStep(stepNum) {
        el.step1.classList.remove('active');
        el.step2.classList.remove('active');
        el.step3.classList.remove('active');

        if (stepNum === 1) el.step1.classList.add('active');
        if (stepNum === 2) el.step2.classList.add('active');
        if (stepNum === 3) el.step3.classList.add('active');
    }

    function resetPOS() {
        el.inpName.value = '';
        el.inpPhone.value = '';
        el.errName.textContent = '';
        el.errPhone.textContent = '';
        
        cart = [];
        currentDiscount = { active: false, discount: 0 };
        currentCategory = 'All';
        searchQuery = '';
        
        if(el.searchInp) el.searchInp.value = '';
        if(el.inpPromo)  el.inpPromo.value = '';
        if(el.errPromo)  el.errPromo.textContent = '';
        // Reset promo UI visibility
        if(el.promoInputBlock)  el.promoInputBlock.style.display = 'flex';
        if(el.promoAppliedTag)  el.promoAppliedTag.style.display = 'none';
        if(el.promoAppliedCode) el.promoAppliedCode.textContent = '';
        
        showStep(1);
        renderCart();
        updateCartTotal();
    }

    // ── Step 1 ────────────────────────────────────────────────────────────
    function bindStep1() {
        el.custForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const n = el.inpName.value;
            const p = el.inpPhone.value;
            
            const validation = Validator.validateCustomerStep(n, p);
            el.errName.textContent = validation.errors.name || '';
            el.errPhone.textContent = validation.errors.phone || '';

            if (validation.isValid) {
                // Initialize catalog and open POS
                renderCategories();
                renderCatalog();
                showStep(2);
            }
        });

        // Instant clear errors
        el.inpName.addEventListener('input', () => el.errName.textContent = '');
        el.inpPhone.addEventListener('input', () => el.errPhone.textContent = '');
    }

    // ── Step 2 Catalog ────────────────────────────────────────────────────
    function renderCategories() {
        const cats = DataStore.getCategories();
        el.catList.innerHTML = '';
        cats.forEach(c => {
            const btn = document.createElement('button');
            btn.className = `cat-btn ${c === currentCategory ? 'active' : ''}`;
            btn.textContent = c;
            btn.addEventListener('click', () => {
                currentCategory = c;
                document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCatalog();
            });
            el.catList.appendChild(btn);
        });
    }

    function renderCatalog() {
        const products = DataStore.searchCatalog(searchQuery, currentCategory);
        el.prodGrid.innerHTML = '';

        if (products.length === 0) {
            el.prodGrid.innerHTML = `<div class="empty-state">No products found.</div>`;
            return;
        }

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'prod-card';
            card.innerHTML = `
                <div class="prod-img">${p.image}</div>
                <div class="prod-info">
                    <div class="prod-name">${p.name}</div>
                    <div class="prod-price">₹${p.price.toFixed(2)}</div>
                </div>
            `;
            card.addEventListener('click', () => addToCart(p));
            el.prodGrid.appendChild(card);
        });
    }

    function bindSearch() {
        el.searchInp.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderCatalog();
        });
    }

    // ── Cart Sidebar ──────────────────────────────────────────────────────
    function addToCart(product) {
        const existing = cart.find(c => c.id === product.id);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }
        renderCart();
    }

    function updateCartQty(id, delta) {
        const item = cart.find(c => c.id === id);
        if(!item) return;
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(c => c.id !== id);
        }
        renderCart();
    }

    function renderCart() {
        el.cartList.innerHTML = '';
        
        if (cart.length === 0) {
            el.cartList.innerHTML = `<div class="cart-empty text-muted">Cart is empty. Click items to add.</div>`;
            el.btnCheckout.disabled = true;
        } else {
            el.btnCheckout.disabled = false;
        }

        cart.forEach(c => {
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <div class="c-info">
                    <div class="c-name">${c.name}</div>
                    <div class="c-price">₹${(c.price * c.qty).toFixed(2)}</div>
                </div>
                <div class="c-actions">
                    <button class="qty-btn dec" data-id="${c.id}">-</button>
                    <span>${c.qty}</span>
                    <button class="qty-btn inc" data-id="${c.id}">+</button>
                </div>
            `;
            el.cartList.appendChild(row);
        });

        // Re-attach qty listeners
        document.querySelectorAll('.qty-btn').forEach(b => {
            b.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const delta = e.target.classList.contains('inc') ? 1 : -1;
                updateCartQty(id, delta);
            });
        });

        updateCartTotal();
    }

    function bindPromo() {
        el.btnPromo.addEventListener('click', () => {
            const code = el.inpPromo.value.trim();
            if(!code) return;
            el.errPromo.textContent = '';

            if (cart.length === 0) {
                el.errPromo.textContent = 'Add items to the cart before applying a promo code.';
                return;
            }
            
            const subtotal = cart.reduce((s, c) => s + (c.price * c.qty), 0);
            const res = DataStore.applyPromo(code, subtotal);
            
            if (res.active) {
                currentDiscount = res;
                // Show applied badge, hide input
                el.promoInputBlock.style.display  = 'none';
                el.promoAppliedTag.style.display   = 'flex';
                el.promoAppliedCode.textContent = code.toUpperCase();
                updateCartTotal();
            } else {
                el.errPromo.textContent = res.error || 'Invalid Code';
                currentDiscount = { active: false, discount: 0 };
                updateCartTotal();
            }
        });
        
        el.inpPromo.addEventListener('input', () => el.errPromo.textContent = '');

        // Remove promo handler
        el.btnRemovePromo.addEventListener('click', () => {
            currentDiscount = { active: false, discount: 0 };
            el.inpPromo.value = '';
            el.errPromo.textContent = '';
            el.promoAppliedTag.style.display  = 'none';
            el.promoInputBlock.style.display  = 'flex';
            el.promoAppliedCode.textContent = '';
            updateCartTotal();
        });
    }

    function updateCartTotal() {
        const subtotal = cart.reduce((s, c) => s + (c.price * c.qty), 0);
        
        // Re-evaluate discount bounds if cart changes
        if (currentDiscount.active) {
            const res = DataStore.applyPromo(currentDiscount.code, subtotal);
            currentDiscount = res;
        }

        const total = subtotal - currentDiscount.discount;

        el.subSpan.textContent = `₹${subtotal.toFixed(2)}`;
        el.discSpan.textContent = `- ₹${currentDiscount.discount.toFixed(2)}`;
        el.totSpan.textContent = `₹${total.toFixed(2)}`;
    }

    // ── Checkout & Step 3 ────────────────────────────────────────────────
    function bindCheckout() {
        el.btnCheckout.addEventListener('click', () => {
            if (cart.length === 0) return;
            if (callbacks.onCheckout) {
                callbacks.onCheckout({
                    customer: { name: el.inpName.value, phone: el.inpPhone.value },
                    cart,
                    discount: currentDiscount
                });
            }
            showStep(3);
        });

        el.btnReset.addEventListener('click', () => {
            resetPOS();
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────
    function init() {
        cacheElements();
        bindStep1();
        bindSearch();
        bindPromo();
        bindCheckout();
        
        resetPOS();
    }

    return {
        init,
        setCallbacks: cbs => callbacks = { ...callbacks, ...cbs }
    };
})();
