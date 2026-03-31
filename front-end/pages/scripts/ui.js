/**
 * ui.js - POS Grid & Wizard DOM Manager
 */

const UI = (() => {
    'use strict';

    let el = {};
    let cart = [];
    let currentDiscount = { active: false, discount: 0 };
    let currentCategory = 'All';
    let searchQuery = '';
    let currentCustomerProfile = null;
    let currentCheckoutMode = 'takeaway_now';
    let sessionContext = { roleKey: 'cashier', roleLabel: 'Cashier', isCustomerTerminal: false };

    let callbacks = { onCheckout: null };

    function cacheElements() {
        el = {
            step1: document.getElementById('step-1-customer'),
            step2: document.getElementById('step-2-pos'),
            step3: document.getElementById('step-3-payment'),

            // Step 1 Form
            custForm: document.getElementById('customerForm'),
            inpName: document.getElementById('cName'),
            inpPhone: document.getElementById('cPhone'),
            inpEmail: document.getElementById('cEmail'),
            inpAddress: document.getElementById('cAddress'),
            inpNotes: document.getElementById('cNotes'),
            selDeliveryOption: document.getElementById('cDeliveryOption'),
            inpDeliveryPartner: document.getElementById('cDeliveryPartner'),
            inpDeliveryPartnerPhone: document.getElementById('cDeliveryPartnerPhone'),
            lookupHint: document.getElementById('customerLookupHint'),
            deliveryPartnerFields: document.getElementById('deliveryPartnerFields'),

            errName: document.getElementById('errName'),
            errPhone: document.getElementById('errPhone'),
            errEmail: document.getElementById('errEmail'),
            errAddress: document.getElementById('errAddress'),

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
            checkoutModeGrid: document.getElementById('checkoutModeGrid'),
            checkoutModeError: document.getElementById('checkoutModeError'),
            checkoutSummary: document.getElementById('paymentOutcomeSummary'),

            // Step 2 Discount
            inpPromo: document.getElementById('promoCode'),
            btnPromo: document.getElementById('applyPromoBtn'),
            errPromo: document.getElementById('promoError'),
            promoInputBlock: document.getElementById('promoInputBlock'),
            promoAppliedTag: document.getElementById('promoAppliedTag'),
            promoAppliedCode: document.getElementById('promoAppliedCode'),
            btnRemovePromo: document.getElementById('removePromoBtn'),

            // Context Menu
            menu: document.getElementById('contextMenu'),

            // Step 3 Actions
            btnReset: document.getElementById('btnResetFlow'),
            paymentTitle: document.getElementById('paymentStepTitle'),
            paymentSubtitle: document.getElementById('paymentStepSubtitle')
        };
    }

    function sanitizePhone(value) {
        return String(value || '').replace(/\D/g, '').slice(0, 10);
    }

    function getTerminalCopy() {
        if (sessionContext.isCustomerTerminal) {
            return {
                lookupInfo: 'Enter your 10-digit phone number to auto-fill saved details.',
                lookupExisting: (name) => `Welcome back, ${name}. Your saved checkout details are ready.`,
                lookupNew: 'No saved profile found yet. We will create one after checkout.'
            };
        }

        return {
            lookupInfo: 'Enter a 10-digit phone number to check existing customer records.',
            lookupExisting: (name) => `Existing customer found: ${name}. Details auto-filled.`,
            lookupNew: 'No existing profile found. Creating a new customer record after checkout.'
        };
    }

    function getCheckoutModeConfig(mode) {
        const safeMode = String(mode || 'takeaway_now').trim().toLowerCase();
        const isCustomer = sessionContext.isCustomerTerminal;
        const titlePrefix = isCustomer ? 'Self-checkout' : 'Order';

        if (safeMode === 'prepaid_delivery') {
            return {
                mode: 'prepaid_delivery',
                deliveryOption: 'delivery',
                paymentMethod: 'Paid Upfront',
                orderStatus: 'Processing',
                buttonLabel: isCustomer ? 'Pay Now for Delivery' : 'Confirm Prepaid Delivery',
                successTitle: 'Payment Gateway Ready',
                successSubtitle: `${titlePrefix} logged for home delivery. Collect payment now and dispatch once confirmed.`,
                summaryLabel: 'Prepaid delivery'
            };
        }

        if (safeMode === 'cod_delivery') {
            return {
                mode: 'cod_delivery',
                deliveryOption: 'delivery',
                paymentMethod: 'COD',
                orderStatus: 'Processing',
                buttonLabel: isCustomer ? 'Confirm COD Delivery' : 'Confirm COD Dispatch',
                successTitle: 'COD Delivery Booked',
                successSubtitle: `${titlePrefix} will be sent for delivery and payment will be collected at the doorstep.`,
                summaryLabel: 'Cash on delivery'
            };
        }

        return {
            mode: 'takeaway_now',
            deliveryOption: 'pickup',
            paymentMethod: 'Counter Paid',
            orderStatus: 'Delivered',
            buttonLabel: isCustomer ? 'Confirm Takeaway' : 'Mark as Takeaway',
            successTitle: 'Takeaway Ready',
            successSubtitle: `${titlePrefix} is marked for immediate handover from the counter.`,
            summaryLabel: 'Take away now'
        };
    }

    function setLookupHint(type, text) {
        if (!el.lookupHint) return;
        el.lookupHint.className = 'text-sm';

        if (type === 'existing') {
            el.lookupHint.classList.add('lookup-existing');
        } else if (type === 'new') {
            el.lookupHint.classList.add('lookup-new');
        } else {
            el.lookupHint.classList.add('text-muted');
        }

        el.lookupHint.textContent = text;
    }

    function showStep(stepNum) {
        if (!el.step1 || !el.step2 || !el.step3) return;

        el.step1.classList.remove('active');
        el.step2.classList.remove('active');
        el.step3.classList.remove('active');

        if (stepNum === 1) el.step1.classList.add('active');
        if (stepNum === 2) el.step2.classList.add('active');
        if (stepNum === 3) el.step3.classList.add('active');
    }

    function toggleDeliveryFields() {
        if (!el.selDeliveryOption || !el.deliveryPartnerFields) return;
        const isDelivery = String(el.selDeliveryOption.value || 'pickup').toLowerCase() === 'delivery';
        el.deliveryPartnerFields.style.display = isDelivery ? 'block' : 'none';
        if (!isDelivery && el.errAddress) el.errAddress.textContent = '';
    }

    function syncCheckoutModeCards() {
        document.querySelectorAll('input[name="checkoutMode"]').forEach(input => {
            const card = input.closest('.checkout-mode-card');
            if (card) card.classList.toggle('active', input.checked);
        });
    }

    function updateCheckoutButtonLabel() {
        if (!el.btnCheckout) return;
        el.btnCheckout.textContent = getCheckoutModeConfig(currentCheckoutMode).buttonLabel;
    }

    function setCheckoutMode(mode, syncDelivery) {
        const config = getCheckoutModeConfig(mode);
        currentCheckoutMode = config.mode;

        document.querySelectorAll('input[name="checkoutMode"]').forEach(input => {
            input.checked = input.value === config.mode;
        });
        syncCheckoutModeCards();
        updateCheckoutButtonLabel();

        if (el.checkoutModeError) el.checkoutModeError.textContent = '';

        if (syncDelivery !== false && el.selDeliveryOption) {
            el.selDeliveryOption.value = config.deliveryOption;
            toggleDeliveryFields();
        }
    }

    function buildCheckoutCustomerPayload() {
        const config = getCheckoutModeConfig(currentCheckoutMode);
        const payload = getCustomerPayload();
        payload.checkoutMode = config.mode;
        payload.deliveryOption = config.deliveryOption;
        payload.paymentMethod = config.paymentMethod;
        payload.orderStatus = config.orderStatus;

        if (config.deliveryOption !== 'delivery') {
            payload.deliveryPartner = '';
            payload.deliveryPartnerPhone = '';
        }

        return payload;
    }

    function renderCheckoutSummary(order, customerPayload) {
        if (!el.checkoutSummary) return;
        const config = getCheckoutModeConfig(customerPayload && customerPayload.checkoutMode);
        const detailAddress = customerPayload.deliveryOption === 'delivery'
            ? (customerPayload.address || 'Address to be confirmed')
            : 'Counter pickup';

        el.checkoutSummary.style.display = 'grid';
        el.checkoutSummary.innerHTML = `
            <div class="checkout-summary-row"><span>Order ID</span><strong>${order.id}</strong></div>
            <div class="checkout-summary-row"><span>Customer</span><strong>${order.customer || '-'}</strong></div>
            <div class="checkout-summary-row"><span>Mode</span><strong>${config.summaryLabel}</strong></div>
            <div class="checkout-summary-row"><span>Payment</span><strong>${order.paymentMethod || config.paymentMethod}</strong></div>
            <div class="checkout-summary-row"><span>Total</span><strong>Rs ${Math.max(0, Number(order.total || 0)).toFixed(2)}</strong></div>
            <div class="checkout-summary-row"><span>Destination</span><strong>${detailAddress}</strong></div>
        `;

        const titleEl = document.getElementById('paymentStepTitle');
        const subtitleEl = document.getElementById('paymentStepSubtitle');
        if (titleEl) titleEl.textContent = config.successTitle;
        if (subtitleEl) subtitleEl.textContent = config.successSubtitle;
    }

    function applyCustomerProfile(profile) {
        if (!profile) return;

        if (el.inpName) el.inpName.value = String(profile.name || '').trim();
        if (el.inpEmail) el.inpEmail.value = String(profile.email || '').trim();
        if (el.inpAddress) el.inpAddress.value = String(profile.address || '').trim();
        if (el.inpNotes) el.inpNotes.value = String(profile.notes || '').trim();

        if (el.selDeliveryOption) {
            const option = String(profile.preferredDeliveryOption || 'pickup').toLowerCase();
            el.selDeliveryOption.value = option === 'delivery' ? 'delivery' : 'pickup';
        }

        if (el.inpDeliveryPartner) {
            el.inpDeliveryPartner.value = String(profile.deliveryPartner || '').trim();
        }
        if (el.inpDeliveryPartnerPhone) {
            el.inpDeliveryPartnerPhone.value = String(profile.deliveryPartnerPhone || '').trim();
        }

        toggleDeliveryFields();
    }

    function runCustomerLookup() {
        if (!el.inpPhone) return;
        const phone = sanitizePhone(el.inpPhone.value);
        el.inpPhone.value = phone;

        if (phone.length < 10) {
            currentCustomerProfile = null;
            setLookupHint('info', getTerminalCopy().lookupInfo);
            return;
        }

        const profile = DataStore.getCustomerByPhone(phone);
        const hadExistingProfile = Boolean(currentCustomerProfile);
        currentCustomerProfile = profile;

        if (profile) {
            applyCustomerProfile(profile);
            setLookupHint('existing', getTerminalCopy().lookupExisting(profile.name));
        } else {
            if (hadExistingProfile) {
                if (el.inpEmail) el.inpEmail.value = '';
                if (el.inpAddress) el.inpAddress.value = '';
                if (el.inpNotes) el.inpNotes.value = '';
                if (el.selDeliveryOption) el.selDeliveryOption.value = 'pickup';
                if (el.inpDeliveryPartner) el.inpDeliveryPartner.value = '';
                if (el.inpDeliveryPartnerPhone) el.inpDeliveryPartnerPhone.value = '';
                toggleDeliveryFields();
            }
            setLookupHint('new', getTerminalCopy().lookupNew);
        }
    }

    function getCustomerPayload() {
        return {
            name: String(el.inpName && el.inpName.value || '').trim(),
            phone: sanitizePhone(el.inpPhone && el.inpPhone.value || ''),
            email: String(el.inpEmail && el.inpEmail.value || '').trim(),
            address: String(el.inpAddress && el.inpAddress.value || '').trim(),
            notes: String(el.inpNotes && el.inpNotes.value || '').trim(),
            deliveryOption: String(el.selDeliveryOption && el.selDeliveryOption.value || 'pickup').toLowerCase(),
            deliveryPartner: String(el.inpDeliveryPartner && el.inpDeliveryPartner.value || '').trim(),
            deliveryPartnerPhone: String(el.inpDeliveryPartnerPhone && el.inpDeliveryPartnerPhone.value || '').trim(),
            isExistingCustomer: Boolean(currentCustomerProfile)
        };
    }

    function resetPOS() {
        if (el.inpName) el.inpName.value = '';
        if (el.inpPhone) el.inpPhone.value = '';
        if (el.inpEmail) el.inpEmail.value = '';
        if (el.inpAddress) el.inpAddress.value = '';
        if (el.inpNotes) el.inpNotes.value = '';
        if (el.selDeliveryOption) el.selDeliveryOption.value = 'pickup';
        if (el.inpDeliveryPartner) el.inpDeliveryPartner.value = '';
        if (el.inpDeliveryPartnerPhone) el.inpDeliveryPartnerPhone.value = '';

        if (el.errName) el.errName.textContent = '';
        if (el.errPhone) el.errPhone.textContent = '';
        if (el.errEmail) el.errEmail.textContent = '';
        if (el.errAddress) el.errAddress.textContent = '';

        currentCustomerProfile = null;
        setCheckoutMode('takeaway_now');
        setLookupHint('info', getTerminalCopy().lookupInfo);

        cart = [];
        currentDiscount = { active: false, discount: 0 };
        currentCategory = 'All';
        searchQuery = '';

        if (el.searchInp) el.searchInp.value = '';
        if (el.inpPromo) el.inpPromo.value = '';
        if (el.errPromo) el.errPromo.textContent = '';

        if (el.promoInputBlock) el.promoInputBlock.style.display = 'flex';
        if (el.promoAppliedTag) el.promoAppliedTag.style.display = 'none';
        if (el.promoAppliedCode) el.promoAppliedCode.textContent = '';
        if (el.checkoutSummary) {
            el.checkoutSummary.style.display = 'none';
            el.checkoutSummary.innerHTML = '';
        }
        if (el.paymentTitle) el.paymentTitle.textContent = sessionContext.isCustomerTerminal ? 'Ready for Payment' : 'Routing to Gateway...';
        if (el.paymentSubtitle) {
            el.paymentSubtitle.textContent = sessionContext.isCustomerTerminal
                ? 'Your order is prepared. Complete payment to confirm the self-checkout.'
                : 'The payload has been sent successfully. The user chooses Card, UPI, etc., on their device/interface. Webhook triggers upon completion.';
        }

        showStep(1);
        renderCart();
        updateCartTotal();
    }

    function bindStep1() {
        if (!el.custForm) return;

        el.custForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const customerPayload = getCustomerPayload();
            const validation = Validator.validateCustomerStep(customerPayload);

            if (el.errName) el.errName.textContent = validation.errors.name || '';
            if (el.errPhone) el.errPhone.textContent = validation.errors.phone || '';
            if (el.errEmail) el.errEmail.textContent = validation.errors.email || '';
            if (el.errAddress) el.errAddress.textContent = validation.errors.address || '';

            if (validation.isValid) {
                if (el.selDeliveryOption && String(el.selDeliveryOption.value || 'pickup').toLowerCase() === 'delivery' && currentCheckoutMode === 'takeaway_now') {
                    setCheckoutMode('prepaid_delivery', false);
                }
                renderCategories();
                renderCatalog();
                showStep(2);
            }
        });

        if (el.inpName) {
            el.inpName.addEventListener('input', () => {
                if (el.errName) el.errName.textContent = '';
            });
        }

        if (el.inpPhone) {
            el.inpPhone.addEventListener('input', () => {
                if (el.errPhone) el.errPhone.textContent = '';
                runCustomerLookup();
            });

            el.inpPhone.addEventListener('blur', runCustomerLookup);
        }

        if (el.inpEmail) {
            el.inpEmail.addEventListener('input', () => {
                if (el.errEmail) el.errEmail.textContent = '';
            });
        }

        if (el.inpAddress) {
            el.inpAddress.addEventListener('input', () => {
                if (el.errAddress) el.errAddress.textContent = '';
            });
        }

        if (el.selDeliveryOption) {
            el.selDeliveryOption.addEventListener('change', () => {
                toggleDeliveryFields();
                if (el.errAddress) el.errAddress.textContent = '';
                if (String(el.selDeliveryOption.value || 'pickup').toLowerCase() === 'delivery') {
                    if (currentCheckoutMode === 'takeaway_now') setCheckoutMode('prepaid_delivery', false);
                } else if (currentCheckoutMode !== 'takeaway_now') {
                    setCheckoutMode('takeaway_now', false);
                }
            });
        }
    }

    function bindCheckoutModes() {
        document.querySelectorAll('input[name="checkoutMode"]').forEach(input => {
            input.addEventListener('change', () => {
                if (input.checked) setCheckoutMode(input.value);
            });
        });
        syncCheckoutModeCards();
        updateCheckoutButtonLabel();
    }

    function renderCategories() {
        const cats = DataStore.getCategories();
        if (!el.catList) return;
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
        if (!el.prodGrid) return;

        el.prodGrid.innerHTML = '';

        if (products.length === 0) {
            el.prodGrid.innerHTML = '<div class="empty-state">No products found.</div>';
            return;
        }

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'prod-card';
            const defaultOpt = p.options[0];
            card.innerHTML = `
                <div class="prod-img">${p.image}</div>
                <div class="prod-info">
                    <div class="prod-name">${p.name} (${defaultOpt.label})</div>
                    <div class="prod-price">\u20B9${defaultOpt.price.toFixed(2)}</div>
                </div>
            `;

            card.addEventListener('click', (event) => {
                if (event.button === 0) addToCart(p);
            });

            card.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                showContextMenu(event.pageX, event.pageY, p);
            });

            let pressTimer;
            card.addEventListener('touchstart', (event) => {
                pressTimer = window.setTimeout(() => {
                    const touch = event.touches[0];
                    showContextMenu(touch.pageX, touch.pageY, p);
                }, 600);
            });
            card.addEventListener('touchend', () => clearTimeout(pressTimer));
            card.addEventListener('touchmove', () => clearTimeout(pressTimer));

            el.prodGrid.appendChild(card);
        });
    }

    function showContextMenu(x, y, product) {
        if (!el.menu) return;
        el.menu.innerHTML = '';

        product.options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.innerHTML = `
                <span class="cmi-label">${opt.label}</span>
                <span class="cmi-price">\u20B9${opt.price.toFixed(2)}</span>
            `;
            item.addEventListener('click', (event) => {
                event.stopPropagation();
                addToCart(product, opt);
                hideContextMenu();
            });
            el.menu.appendChild(item);
        });

        el.menu.style.display = 'block';
        el.menu.style.left = `${x}px`;
        el.menu.style.top = `${y}px`;

        const bounds = el.menu.getBoundingClientRect();
        if (x + bounds.width > window.innerWidth) el.menu.style.left = `${x - bounds.width}px`;
        if (y + bounds.height > window.innerHeight) el.menu.style.top = `${y - bounds.height}px`;
    }

    function hideContextMenu() {
        if (el.menu) el.menu.style.display = 'none';
    }

    function bindContextMenuGlobal() {
        document.addEventListener('click', () => hideContextMenu());
        window.addEventListener('scroll', () => hideContextMenu(), true);
    }

    function bindSearch() {
        if (!el.searchInp) return;
        el.searchInp.addEventListener('input', (event) => {
            searchQuery = event.target.value;
            renderCatalog();
        });
    }

    function addToCart(product, option) {
        const opt = option || product.options[0];
        const cartId = `${product.id}-${opt.label}`;
        const existing = cart.find(c => c.cartId === cartId);

        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({
                cartId,
                id: product.id,
                name: `${product.name} (${opt.label})`,
                price: opt.price,
                qty: 1
            });
        }

        renderCart();
    }

    function updateCartQty(cartId, delta) {
        const item = cart.find(c => c.cartId === cartId);
        if (!item) return;

        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(c => c.cartId !== cartId);
        }

        renderCart();
    }

    function renderCart() {
        if (!el.cartList || !el.btnCheckout) return;

        el.cartList.innerHTML = '';

        if (cart.length === 0) {
            el.cartList.innerHTML = '<div class="cart-empty text-muted">Cart is empty. Click items to add.</div>';
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
                    <div class="c-price">\u20B9${(c.price * c.qty).toFixed(2)}</div>
                </div>
                <div class="c-actions">
                    <button class="qty-btn dec" data-id="${c.cartId}">-</button>
                    <span>${c.qty}</span>
                    <button class="qty-btn inc" data-id="${c.cartId}">+</button>
                </div>
            `;
            el.cartList.appendChild(row);
        });

        document.querySelectorAll('.qty-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.getAttribute('data-id');
                const delta = event.target.classList.contains('inc') ? 1 : -1;
                updateCartQty(id, delta);
            });
        });

        updateCartTotal();
    }

    function bindPromo() {
        if (!el.btnPromo || !el.inpPromo || !el.errPromo) return;

        el.btnPromo.addEventListener('click', () => {
            const code = el.inpPromo.value.trim();
            if (!code) return;

            el.errPromo.textContent = '';

            if (cart.length === 0) {
                el.errPromo.textContent = 'Add items to the cart before applying a promo code.';
                return;
            }

            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const res = DataStore.applyPromo(code, subtotal);

            if (res.active) {
                currentDiscount = res;
                if (el.promoInputBlock) el.promoInputBlock.style.display = 'none';
                if (el.promoAppliedTag) el.promoAppliedTag.style.display = 'flex';
                if (el.promoAppliedCode) el.promoAppliedCode.textContent = code.toUpperCase();
                updateCartTotal();
                return;
            }

            el.errPromo.textContent = res.error || 'Invalid Code';
            currentDiscount = { active: false, discount: 0 };
            updateCartTotal();
        });

        el.inpPromo.addEventListener('input', () => {
            el.errPromo.textContent = '';
        });

        if (el.btnRemovePromo) {
            el.btnRemovePromo.addEventListener('click', () => {
                currentDiscount = { active: false, discount: 0 };
                el.inpPromo.value = '';
                el.errPromo.textContent = '';
                if (el.promoAppliedTag) el.promoAppliedTag.style.display = 'none';
                if (el.promoInputBlock) el.promoInputBlock.style.display = 'flex';
                if (el.promoAppliedCode) el.promoAppliedCode.textContent = '';
                updateCartTotal();
            });
        }
    }

    function updateCartTotal() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        if (currentDiscount.active) {
            const res = DataStore.applyPromo(currentDiscount.code, subtotal);
            currentDiscount = res;
        }

        const total = subtotal - currentDiscount.discount;

        if (el.subSpan) el.subSpan.textContent = `\u20B9${subtotal.toFixed(2)}`;
        if (el.discSpan) el.discSpan.textContent = `- \u20B9${currentDiscount.discount.toFixed(2)}`;
        if (el.totSpan) el.totSpan.textContent = `\u20B9${total.toFixed(2)}`;
    }

    function bindCheckout() {
        if (!el.btnCheckout || !el.btnReset) return;

        el.btnCheckout.addEventListener('click', () => {
            if (cart.length === 0) return;

            const customerPayload = buildCheckoutCustomerPayload();
            const validation = Validator.validateCustomerStep(customerPayload);
            if (!validation.isValid) {
                if (el.errName) el.errName.textContent = validation.errors.name || '';
                if (el.errPhone) el.errPhone.textContent = validation.errors.phone || '';
                if (el.errEmail) el.errEmail.textContent = validation.errors.email || '';
                if (el.errAddress) el.errAddress.textContent = validation.errors.address || '';
                if (el.checkoutModeError) {
                    el.checkoutModeError.textContent = validation.errors.address
                        ? 'Delivery needs a valid address before confirmation.'
                        : 'Please complete the customer details before checkout.';
                }
                showStep(1);
                return;
            }

            let createdOrder = null;
            if (callbacks.onCheckout) {
                createdOrder = callbacks.onCheckout({
                    customer: customerPayload,
                    cart,
                    discount: currentDiscount
                }) || null;
            }

            if (createdOrder) renderCheckoutSummary(createdOrder, customerPayload);
            showStep(3);
        });

        el.btnReset.addEventListener('click', () => {
            resetPOS();
        });
    }

    function init() {
        cacheElements();
        bindStep1();
        bindCheckoutModes();
        bindSearch();
        bindPromo();
        bindCheckout();
        bindContextMenuGlobal();
        toggleDeliveryFields();
        resetPOS();
    }

    return {
        init,
        setCallbacks: cbs => callbacks = { ...callbacks, ...cbs },
        setSessionContext: context => {
            sessionContext = { ...sessionContext, ...(context && typeof context === 'object' ? context : {}) };
        }
    };
})();
