import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { useAuth } from '../context/useAuth.js'
import {
  buildNextId,
  buildNotification,
  formatCurrency,
  formatTimestamp,
} from '../services/workspaceService.js'

const INITIAL_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  address: '',
  deliveryPartner: '',
  deliveryPartnerPhone: '',
}
const EMPTY_LIST = []

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10)
}

function getModeConfig(mode) {
  if (mode === 'prepaid_delivery') {
    return {
      label: 'Delivery + Pay Upfront',
      deliveryOption: 'delivery',
      payment: 'Paid Upfront',
      status: 'Processing',
    }
  }

  if (mode === 'cod_delivery') {
    return {
      label: 'Delivery + COD',
      deliveryOption: 'delivery',
      payment: 'COD',
      status: 'Processing',
    }
  }

  return {
    label: 'Take Away Now',
    deliveryOption: 'pickup',
    payment: 'Counter Paid',
    status: 'Delivered',
  }
}

function CashierPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const {
    activeBusiness,
    cashierData,
    customers,
    currentUser,
    isLoading,
    error,
    mutateWorkspace,
  } = useWorkspaceData()

  useEffect(() => {
    document.title = 'BillBhai - Cashier POS'
    document.body.setAttribute('data-page', 'cashier')
    document.body.setAttribute('data-app-ready', 'true')
    document.body.classList.add('no-sidebar')
    return () => {
      document.body.removeAttribute('data-page')
      document.body.classList.remove('no-sidebar')
    }
  }, [])

  const [step, setStep] = useState(1)
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER)
  const [lookupMessage, setLookupMessage] = useState('Enter a 10-digit phone number to check existing customer records.')
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState('')
  const [checkoutMode, setCheckoutMode] = useState('takeaway_now')
  const [successSummary, setSuccessSummary] = useState(null)

  const isCustomerTerminal = currentUser?.role === 'customer'
  const deliveryCharge = Number(cashierData?.settings?.deliveryCharge || 0)
  const catalog = Array.isArray(cashierData?.catalog) ? cashierData.catalog : EMPTY_LIST
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(catalog.map((item) => item.category))).sort()],
    [catalog],
  )

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase()
    return catalog.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category
      const matchesSearch =
        !query
        || String(item.name || '').toLowerCase().includes(query)
        || String(item.id || '').toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [catalog, category, search])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
    const promo = cashierData?.promos?.[appliedPromo]
    let discount = 0

    if (promo?.type === 'percent') {
      discount = subtotal * (Number(promo.value || 0) / 100)
    } else if (promo?.type === 'fixed') {
      discount = Number(promo.value || 0)
    }

    const itemTotal = Math.max(0, subtotal - discount)
    const modeConfig = getModeConfig(checkoutMode)
    const deliveryFee = modeConfig.deliveryOption === 'delivery' ? deliveryCharge : 0
    return {
      subtotal,
      discount,
      deliveryFee,
      total: itemTotal + deliveryFee,
    }
  }, [appliedPromo, cart, cashierData?.promos, checkoutMode, deliveryCharge])

  const handlePhoneLookup = (value) => {
    const phone = normalizePhone(value)
    setCustomer((prev) => ({ ...prev, phone }))
    if (phone.length !== 10) {
      setLookupMessage('Enter a valid 10-digit phone number to auto-fill saved details.')
      return
    }

    const existing = customers[phone]
    if (!existing) {
      setLookupMessage('No saved profile found yet. We will create one after checkout.')
      return
    }

    setCustomer((prev) => ({
      ...prev,
      phone,
      name: existing.name || prev.name,
      email: existing.email || prev.email,
      notes: existing.notes || prev.notes,
      address: existing.address || prev.address,
      deliveryPartner: existing.deliveryPartner || prev.deliveryPartner,
      deliveryPartnerPhone: existing.deliveryPartnerPhone || prev.deliveryPartnerPhone,
    }))
    setLookupMessage(`Welcome back, ${existing.name}. Saved checkout details are ready.`)
  }

  const addToCart = (product, option) => {
    const key = `${product.id}-${option.label}`
    setCart((prev) => {
      const index = prev.findIndex((item) => item.key === key)
      if (index >= 0) {
        const next = [...prev]
        next[index] = { ...next[index], qty: next[index].qty + 1 }
        return next
      }

      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          option: option.label,
          price: Number(option.price || 0),
          qty: 1,
        },
      ]
    })
  }

  const updateCartQty = (key, delta) => {
    setCart((prev) => prev
      .map((item) => item.key === key ? { ...item, qty: item.qty + delta } : item)
      .filter((item) => item.qty > 0))
  }

  const resetFlow = () => {
    setStep(1)
    setCustomer(INITIAL_CUSTOMER)
    setLookupMessage('Enter a 10-digit phone number to check existing customer records.')
    setCart([])
    setPromoCode('')
    setAppliedPromo('')
    setCheckoutMode('takeaway_now')
    setSuccessSummary(null)
  }

  const applyPromo = () => {
    const safeCode = String(promoCode || '').trim().toUpperCase()
    if (cashierData?.promos?.[safeCode]) {
      setAppliedPromo(safeCode)
    }
  }

  const completeCheckout = async () => {
    if (!activeBusiness) return

    const modeConfig = getModeConfig(checkoutMode)
    const orderId = await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      const target = draft.dataByBusiness[businessId]
      const nextOrderId = buildNextId('ORD', target.orders, 551)
      const order = {
        id: nextOrderId,
        customer: String(customer.name || '').trim() || 'Walk-in',
        items: cart.reduce((sum, item) => sum + item.qty, 0),
        total: totals.total,
        payment: modeConfig.payment,
        status: modeConfig.status,
        date: formatTimestamp(),
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        deliveryOption: modeConfig.deliveryOption,
        deliveryPartner: customer.deliveryPartner,
        deliveryPartnerPhone: customer.deliveryPartnerPhone,
      }

      target.orders.unshift(order)

      if (modeConfig.deliveryOption === 'delivery') {
        target.deliveries.unshift({
          id: buildNextId('DEL', target.deliveries, 551),
          oid: nextOrderId,
          customer: order.customer,
          address: customer.address || 'Address to be confirmed',
          partner: customer.deliveryPartner,
          partnerPhone: customer.deliveryPartnerPhone,
          status: customer.deliveryPartner ? 'In Transit' : 'Pending',
          etaMin: 40,
          time: formatTimestamp().slice(-5),
          updatedAt: formatTimestamp(),
        })
      }

      draft.customers[customer.phone] = {
        phone: customer.phone,
        name: order.customer,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        preferredDeliveryOption: modeConfig.deliveryOption,
        deliveryPartner: customer.deliveryPartner,
        deliveryPartnerPhone: customer.deliveryPartnerPhone,
        lastOrderId: nextOrderId,
        lastOrderAt: order.date,
        orderCount: Number(draft.customers[customer.phone]?.orderCount || 0) + 1,
      }

      draft.notifications.unshift(
        buildNotification({
          title: `${nextOrderId} created`,
          desc: `${order.customer} checkout recorded for ${formatCurrency(order.total)} at ${draft.activeBusiness.name}.`,
          type: 'order',
          color: 'blue',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Customer', value: order.customer },
            { label: 'Payment', value: order.payment },
            { label: 'Delivery Option', value: modeConfig.label },
          ],
        }),
      )

      if (modeConfig.deliveryOption === 'delivery') {
        draft.notifications.unshift(
          buildNotification({
            title: `${nextOrderId} queued for delivery`,
            desc: `${customer.deliveryPartner || 'Store delivery team'} will handle dispatch for ${order.customer}.`,
            type: 'delivery',
            color: 'green',
            scopeBusinessId: businessId,
            detailRows: [
              { label: 'Address', value: customer.address || '-' },
              { label: 'Partner', value: customer.deliveryPartner || 'Pending assignment' },
            ],
          }),
        )
      }

      return nextOrderId
    })

    setSuccessSummary({
      orderId,
      amount: totals.total,
      mode: getModeConfig(checkoutMode).label,
      customer: customer.name,
    })
    setStep(4)
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading POS...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <main className="main-content" id="mainContent">
      <header className="top-header">
        <div className="header-left">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
          <div className="breadcrumb">
            <span className="bc-app">{activeBusiness?.name || 'BillBhai'}</span>
            <span className="bc-sep">/</span>
            <span className="bc-page">{isCustomerTerminal ? 'Self Checkout' : 'POS Terminal'}</span>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              signOut()
              navigate('/login', { replace: true })
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="content-area" id="contentArea">
        {step === 1 ? (
          <div className="step-container active">
            <div className="wizard-centered">
              <h3>{isCustomerTerminal ? 'Start Self Checkout' : 'Start New Order'}</h3>
              <p className="text-muted" style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
                Existing shoppers auto-fill once you enter a 10-digit phone number.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (normalizePhone(customer.phone).length !== 10 || !String(customer.name || '').trim()) return
                  setStep(2)
                }}
              >
                <div className="text-sm text-muted" style={{ marginBottom: '12px' }}>{lookupMessage}</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cashierName">Customer Name</label>
                    <input id="cashierName" className="form-control" value={customer.name} onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cashierPhone">Phone Number</label>
                    <input id="cashierPhone" className="form-control" value={customer.phone} onChange={(event) => handlePhoneLookup(event.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cashierEmail">Email</label>
                    <input id="cashierEmail" className="form-control" value={customer.email} onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cashierNotes">Notes</label>
                    <input id="cashierNotes" className="form-control" value={customer.notes} onChange={(event) => setCustomer((prev) => ({ ...prev, notes: event.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {isCustomerTerminal ? 'Begin Shopping' : 'Begin Scanning / Manual Entry'}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="step-container active">
            <div className="pos-layout">
              <div className="pos-main">
                <div className="pos-controls">
                  <div className="pos-search">
                    <input type="text" id="posSearch" placeholder="Search products..." value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                  <div className="category-filters">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`btn ${category === item ? 'btn-primary' : 'btn-outline'} btn-xs`}
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="product-grid">
                  {filteredCatalog.map((product) => (
                    <article key={product.id} className="product-card">
                      <div className="product-visual">{product.image || '🛍️'}</div>
                      <div className="product-meta">
                        <strong>{product.name}</strong>
                        <span>{product.category}</span>
                      </div>
                      <div className="workspace-option-list">
                        {(product.options || []).map((option) => (
                          <button key={`${product.id}-${option.label}`} type="button" className="btn btn-outline btn-xs" onClick={() => addToCart(product, option)}>
                            {option.label} · {formatCurrency(option.price)}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="pos-sidebar">
                <div className="cart-header">Active Cart</div>
                <div className="cart-body">
                  {cart.length ? cart.map((item) => (
                    <div key={item.key} className="cart-item">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="text-muted">{item.option}</div>
                      </div>
                      <div className="workspace-qty-row">
                        <button type="button" className="btn btn-outline btn-xs" onClick={() => updateCartQty(item.key, -1)}>-</button>
                        <span>{item.qty}</span>
                        <button type="button" className="btn btn-outline btn-xs" onClick={() => updateCartQty(item.key, 1)}>+</button>
                      </div>
                    </div>
                  )) : <p className="text-muted">Add products to start billing.</p>}
                </div>
                <div className="cart-footer">
                  <div className="promo-block">
                    <input className="promo-input" placeholder="Promo Code" value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} />
                    <button type="button" className="btn btn-outline btn-xs" onClick={applyPromo}>Apply</button>
                  </div>
                  {appliedPromo ? <div className="text-sm text-muted" style={{ marginBottom: '10px' }}>Promo applied: {appliedPromo}</div> : null}
                  <div className="cf-row"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                  <div className="cf-row"><span>Discount</span><span>- {formatCurrency(totals.discount)}</span></div>
                  <div className="cf-tot"><span>Grand Total</span><span>{formatCurrency(totals.total)}</span></div>
                  <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!cart.length} onClick={() => setStep(3)}>
                    Continue to Fulfillment
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="step-container active">
            <div className="wizard-centered fulfillment-centered">
              <h3>{isCustomerTerminal ? 'How would you like to receive this order?' : 'How should this order go out?'}</h3>
              <div className="checkout-summary-card" style={{ marginBottom: '16px' }}>
                <div className="checkout-summary-row"><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
                <div className="checkout-summary-row"><span>Discount</span><strong>- {formatCurrency(totals.discount)}</strong></div>
                <div className="checkout-summary-row"><span>Delivery Charges</span><strong>{formatCurrency(getModeConfig(checkoutMode).deliveryOption === 'delivery' ? deliveryCharge : 0)}</strong></div>
                <div className="checkout-summary-row"><span>Amount Payable</span><strong>{formatCurrency(totals.total)}</strong></div>
              </div>

              <div className="checkout-mode-grid">
                {['takeaway_now', 'prepaid_delivery', 'cod_delivery'].map((mode) => {
                  const config = getModeConfig(mode)
                  return (
                    <label key={mode} className={`checkout-mode-card ${checkoutMode === mode ? 'active' : ''}`}>
                      <input type="radio" name="checkoutMode" value={mode} checked={checkoutMode === mode} onChange={() => setCheckoutMode(mode)} />
                      <span className="checkout-mode-title">{config.label}</span>
                      <span className="checkout-mode-copy">{config.deliveryOption === 'pickup' ? 'Hand over immediately at the counter.' : 'Prepare this order for delivery dispatch.'}</span>
                    </label>
                  )
                })}
              </div>

              {getModeConfig(checkoutMode).deliveryOption === 'delivery' ? (
                <div className="delivery-details-block" style={{ display: 'block', marginTop: '12px' }}>
                  <label className="form-label" htmlFor="cashierAddress">Delivery Address</label>
                  <textarea id="cashierAddress" className="form-control" rows="2" value={customer.address} onChange={(event) => setCustomer((prev) => ({ ...prev, address: event.target.value }))} />
                  <div className="form-row delivery-contact-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="cashierPartner">Delivery Partner</label>
                      <input id="cashierPartner" className="form-control" value={customer.deliveryPartner} onChange={(event) => setCustomer((prev) => ({ ...prev, deliveryPartner: event.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cashierPartnerPhone">Delivery Contact</label>
                      <input id="cashierPartnerPhone" className="form-control" value={customer.deliveryPartnerPhone} onChange={(event) => setCustomer((prev) => ({ ...prev, deliveryPartnerPhone: event.target.value }))} />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="fulfillment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>Back to Cart</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={completeCheckout}
                  disabled={getModeConfig(checkoutMode).deliveryOption === 'delivery' && !String(customer.address || '').trim()}
                >
                  {isCustomerTerminal ? 'Proceed to Secure Payment' : 'Proceed to Payment Gateway'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="step-container active">
            <div className="wizard-centered success-block">
              <div className="success-icon">✓</div>
              <h3>{isCustomerTerminal ? 'Ready for Payment' : 'Checkout Captured'}</h3>
              <p className="text-muted" style={{ marginBottom: '30px', fontSize: '0.95rem' }}>
                {successSummary ? `${successSummary.orderId} was created for ${successSummary.customer}.` : 'The order was captured successfully.'}
              </p>
              {successSummary ? (
                <div className="checkout-summary-card" style={{ display: 'block' }}>
                  <div className="checkout-summary-row"><span>Order</span><strong>{successSummary.orderId}</strong></div>
                  <div className="checkout-summary-row"><span>Mode</span><strong>{successSummary.mode}</strong></div>
                  <div className="checkout-summary-row"><span>Amount</span><strong>{formatCurrency(successSummary.amount)}</strong></div>
                </div>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={resetFlow}>
                {isCustomerTerminal ? 'Start Another Checkout' : 'Next Customer (Reset POS)'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default CashierPage
