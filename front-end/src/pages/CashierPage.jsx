import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiProvider } from '../api/index.js'
import { useAuth } from '../context/useAuth.js'
import { formatCurrency } from '../services/workspaceService.js'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

/**
 * POS Terminal — the product's core loop:
 * scan → cart → payment → real order/bill/payment rows in PostgreSQL.
 *
 * Everything here hits the live API. There is no local mock: if the
 * backend is unreachable the terminal says so instead of pretending.
 */

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card']

const MODES = [
  {
    id: 'takeaway',
    label: 'Take Away',
    hint: 'Hand over at the counter',
    orderType: 'pickup',
    checkoutMode: 'takeaway_now',
    cod: false,
  },
  {
    id: 'delivery_upfront',
    label: 'Delivery · Pay Now',
    hint: 'Collect full amount at billing',
    orderType: 'delivery',
    checkoutMode: 'prepaid_delivery',
    cod: false,
    needsAddress: true,
    delivery: true,
  },
  {
    id: 'delivery_cod',
    label: 'Delivery · COD',
    hint: 'Collect cash on delivery',
    orderType: 'delivery',
    checkoutMode: 'cod_delivery',
    cod: true,
    needsAddress: true,
    delivery: true,
  },
]

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10)
}

function round2(value) {
  return Number(Math.round(Number(value || 0) * 100) / 100)
}

function CashierPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const isCustomerTerminal = user?.role === 'customer'

  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [products, setProducts] = useState([])
  const [stockByProduct, setStockByProduct] = useState({})

  const [step, setStep] = useState(1) // 1 cart → 2 pay → 3 done
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [promoInput, setPromoInput] = useState('WELCOME10')
  const [promo, setPromo] = useState(null) // { code, discount } from the server
  const [promoError, setPromoError] = useState('')
  const [holds, setHolds] = useState([])
  const [holdsOpen, setHoldsOpen] = useState(false)
  const [holdsLoading, setHoldsLoading] = useState(false)

  const [payMode, setPayMode] = useState('takeaway')
  const [payMethod, setPayMethod] = useState('Cash')
  const [tendered, setTendered] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [savedCustomer, setSavedCustomer] = useState(null)
  const [lookupState, setLookupState] = useState('idle') // idle | found | new
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const searchRef = useRef(null)

  useEffect(() => {
    document.title = 'BillBhai - Cashier POS'
    document.body.setAttribute('data-page', 'componentDidMount')
    document.body.setAttribute('data-app-ready', 'true')
    document.body.classList.add('no-sidebar')
    return () => {
      document.body.removeAttribute('data-page')
      document.body.classList.remove('no-sidebar')
    }
  }, [])

  const businessName = localStorage.getItem('activeBusinessName') || 'BillBhai'

  const loadCatalog = async () => {
    setLoadState('loading')
    try {
      const [products, inventory] = await Promise.all([
        apiProvider.getProducts(),
        apiProvider.getInventory(),
      ])
      const list = Array.isArray(products) ? products : []
      const stockMap = {}
      for (const item of Array.isArray(inventory) ? inventory : []) {
        if (item?.productId) stockMap[item.productId] = Number(item.stock || 0)
      }
      setProducts(list)
      setStockByProduct(stockMap)
      setLoadState(list.length ? 'ready' : 'error')
      if (!list.length) console.error('POS: empty catalog returned by the API')
    } catch (err) {
      console.error('POS: failed to load catalog', err)
      setLoadState('error')
    }
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  // ── Derived catalog ──

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category
      const matchesSearch =
        !query
        || String(product.name || '').toLowerCase().includes(query)
        || String(product.id || '').toLowerCase().includes(query)
        || String(product.barcode || '').toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [products, category, search])

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discount = promo ? Math.min(promo.discount, subtotal) : 0
  const total = round2(Math.max(0, subtotal - discount))

  const stockOf = (productId) => {
    const value = stockByProduct[productId]
    return value === undefined ? null : value
  }

  const addToCart = (product) => {
    const stock = stockOf(product.id)
    const existing = cart.find((item) => item.productId === product.id)
    const nextQty = (existing?.qty || 0) + 1
    if (stock !== null && nextQty > stock) {
      toast.error(`Only ${stock} × ${product.name} in stock`)
      return
    }
    setCart((prev) => {
      if (existing) {
        return prev.map((item) => (item.productId === product.id
          ? { ...item, qty: item.qty + 1 }
          : item))
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price || 0),
        qty: 1,
      }]
    })
  }

  const changeQty = (productId, delta) => {
    setCart((prev) => prev
      .map((item) => {
        if (item.productId !== productId) return item
        const stock = stockOf(productId)
        const next = item.qty + delta
        if (delta > 0 && stock !== null && next > stock) {
          toast.error(`Only ${stock} × ${item.name} in stock`)
          return item
        }
        return { ...item, qty: next }
      })
      .filter((item) => item.qty > 0))
  }

  const handleSearchEnter = async () => {
    const term = search.trim()
    if (!term) return
    // Barcode scanners "type" the code and press Enter — treat an exact
    // barcode hit (local catalog first, then the API) as an instant add.
    const localMatch = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === term.toLowerCase(),
    )
    const product = localMatch || await apiProvider.getProductByBarcode(term)
    if (product) {
      addToCart(product)
      setSearch('')
      searchRef.current?.focus()
      toast.success(`${product.name} added`)
    } else {
      toast.error(`No product with barcode "${term}"`)
    }
    searchRef.current?.focus()
  }

  // ── Promo ──

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoError('')
    try {
      const res = await apiProvider.validatePromotion(code, round2(subtotal))
      if (!res.ok) {
        setPromo(null)
        setPromoError(res.error || 'Invalid promo code')
        return
      }
      setPromo({ code: res.data.code, discount: Number(res.data.discount || 0) })
      toast.success(`Promo ${res.data.code} applied`)
    } catch {
      setPromoError('Could not validate the promo code right now')
    }
  }

  const removePromo = () => {
    setPromo(null)
    setPromoInput('')
    setPromoError('')
  }

  // ── Held bills ──

  const refreshHolds = async () => {
    setHoldsLoading(true)
    try {
      const res = await apiProvider.getHolds()
      setHolds(res.ok && Array.isArray(res.data) ? res.data : [])
    } finally {
      setHoldsLoading(false)
    }
  }

  const toggleHolds = () => {
    const next = !holdsOpen
    setHoldsOpen(next)
    if (next) refreshHolds()
  }

  const holdCart = async () => {
    if (!cart.length) return
    try {
      const res = await apiProvider.createHold({
        label: `${customerName || savedCustomer?.name || 'Walk-in'} · ${cartCount} item${cartCount === 1 ? '' : 's'} · ${formatCurrency(total)}`,
        cart: {
          items: cart,
          customer: { phone: customerPhone, name: customerName, address: customerAddress },
          promoCode: promo?.code || '',
        },
        total,
      })
      if (!res.ok) {
        toast.error(res.error || 'Could not park this cart')
        return
      }
      toast.success('Cart parked')
      setCart([])
      setPromo(null)
      setPromoInput('')
      refreshHolds()
    } catch {
      toast.error('Could not park this cart')
    }
  }

  const resumeHold = async (hold) => {
    const envelope = hold?.cart
    if (!envelope || !Array.isArray(envelope.items)) {
      toast.error('This parked cart is empty')
      return
    }
    setCart(envelope.items)
    setCustomerPhone(envelope.customer?.phone || '')
    setCustomerName(envelope.customer?.name || '')
    setCustomerAddress(envelope.customer?.address || '')
    if (envelope.promoCode) {
      setPromoInput(envelope.promoCode)
      setPromo({ code: envelope.promoCode, discount: 0 })
    }
    setHoldsOpen(false)
    setStep(1)
    toast.success(`Resumed "${hold.label}"`)
    await apiProvider.discardHold(hold.id)
    refreshHolds()
    // Re-validate the promo against the restored subtotal.
    if (envelope.promoCode) applyPromo()
  }

  const discardHold = async (hold) => {
    const res = await apiProvider.discardHold(hold.id)
    if (!res.ok) {
      toast.error(res.error || 'Could not discard the parked cart')
      return
    }
    refreshHolds()
  }

  // ── Customer lookup (payment step) ──

  const handlePhoneLookup = async (value) => {
    const phone = normalizePhone(value)
    setCustomerPhone(phone)
    setSavedCustomer(null)
    setLookupState('idle')
    if (phone.length !== 10) return
    const existing = await apiProvider.getCustomerByPhone(phone)
    if (existing) {
      setSavedCustomer(existing)
      setLookupState('found')
      setCustomerName((prev) => prev || existing.name || '')
      if (existing.address) setCustomerAddress(existing.address)
    } else {
      setLookupState('new')
    }
  }

  // ── Checkout ──

  const payModeDef = MODES.find((m) => m.id === payMode) || MODES[0]
  const modeNeedsAddress = Boolean(payModeDef?.needsAddress)
  const modeIsCod = Boolean(payModeDef?.cod)
  const tenderAmount = payMethod === 'Cash' && tendered !== ''
    ? round2(Number(tendered))
    : total
  const changeDue = Math.max(0, round2(tenderAmount - total))

  const completeSale = async () => {
    if (!cart.length || submitting) return
    setSubmitting(true)
    try {
      // 1. Save a new customer so lifetime stats start accruing.
      let customerId = savedCustomer?.id || ''
      if (!customerId && customerPhone.length === 10 && customerName.trim()) {
        const created = await apiProvider.createCustomer({
          phone: customerPhone,
          name: customerName.trim(),
          address: customerAddress.trim(),
        })
        if (created.ok) {
          customerId = created.data?.id || ''
          setSavedCustomer(created.data)
        } else if (created.status !== 409) {
          // 409 = phone already registered: proceed without the profile link.
          toast.error(created.error || 'Could not save the customer profile')
        }
        if (created.status === 409) {
          const existing = await apiProvider.getCustomerByPhone(customerPhone)
          if (existing) {
            customerId = existing.id
            setSavedCustomer(existing)
          }
        }
      }

      // 2. Order — the server computes the total and decrements stock.
      const mode = MODES.find((m) => m.id === payMode) || MODES[0]
      const orderRes = await apiProvider.createOrder({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          itemPrice: item.price,
        })),
        customerId,
        customerName: customerName.trim() || savedCustomer?.name || 'Walk-in',
        customerAddress: mode.delivery ? customerAddress.trim() : '',
        notes: '',
        orderType: mode.orderType,
        checkoutMode: mode.checkoutMode,
        paymentMethod: mode.cod ? 'COD' : payMethod,
        promoCode: promo?.code || '',
      })
      if (!orderRes.ok) {
        toast.error(orderRes.error || 'Checkout failed')
        return
      }
      const order = orderRes.data

      // 3. Bill (find-or-create keeps retries from stacking bills).
      let billNo = ''
      const billsRes = await apiProvider.getBills()
      const existingBill = (Array.isArray(billsRes) ? billsRes : [])
        .find((bill) => bill.orderId === order.id)
      if (existingBill) {
        billNo = existingBill.billNo
      } else {
        const billRes = await apiProvider.createBill({ orderId: order.id })
        if (!billRes.ok) {
          toast.error(billRes.error || `Order ${order.id} saved but billing failed`)
          setResult({ order, stage: 'bill-failed' })
          setStep(3)
          return
        }
        billNo = billRes.data.billNo
      }

      // 4. Payment (skipped for COD — collected at the doorstep).
      let paymentInfo = null
      if (!mode.cod) {
        const payRes = await apiProvider.createPayment({
          billNo,
          amountPaid: tenderAmount,
          paymentMethod: payMethod,
        })
        if (!payRes.ok) {
          toast.error(payRes.error || `Order ${order.id} billed but payment failed`)
          setResult({ order, billNo, stage: 'payment-failed' })
          setStep(3)
          return
        }
        paymentInfo = payRes.data
      }

      setResult({
        order,
        billNo,
        stage: 'complete',
        mode,
        method: mode.cod ? 'COD' : payMethod,
        tendered: mode.cod ? 0 : tenderAmount,
        change: mode.cod ? 0 : changeDue,
        balanceDue: paymentInfo?.balanceDue ?? total,
      })
      setStep(3)
    } catch (err) {
      toast.error(err?.message || 'Checkout failed')
    } finally {
      setSubmitting(false)
    }
  }

  const resetFlow = () => {
    setStep(1)
    setCart([])
    setSearch('')
    setCategory('All')
    setPromo(null)
    setPromoInput('')
    setPromoError('')
    setPayMode('takeaway')
    setPayMethod('Cash')
    setTendered('')
    setCustomerPhone('')
    setCustomerName('')
    setCustomerAddress('')
    setSavedCustomer(null)
    setLookupState('idle')
    setResult(null)
    searchRef.current?.focus()
  }

  // ── Step indicator ──

  const renderSteps = () => (
    <div className="pos-steps">
      {[{ id: 1, label: 'Cart' }, { id: 2, label: 'Payment' }].map((def, index) => (
        <span key={def.id} className="pos-step-wrap">
          {index > 0 ? <span className="pos-step-sep">›</span> : null}
          <button
            type="button"
            className={`pos-step ${step === def.id ? 'current' : ''} ${def.id < step ? 'done' : ''}`}
            onClick={def.id < step ? () => setStep(def.id) : undefined}
            style={{ cursor: def.id < step ? 'pointer' : 'default' }}
            aria-current={step === def.id ? 'step' : undefined}
          >
            {def.id < step ? '✓' : def.id} {def.label}
          </button>
        </span>
      ))}
    </div>
  )

  if (isCustomerTerminal) {
    return (
      <main className="main-content" id="mainContent">
        <div className="content-area">
          <PageState
            error="Self-checkout is not available yet. Our staff will be happy to bill you at the counter."
            label="POS Terminal"
          />
        </div>
      </main>
  )
  }

  if (loadState === 'loading') {
    return (
      <main className="main-content" id="mainContent">
        <div className="content-area">
          <PageState loading label="Loading products…" />
        </div>
      </main>
    )
  }

  if (loadState === 'error') {
    return (
      <main className="main-content" id="mainContent">
        <div className="content-area">
          <PageState
            error="The product catalog could not be loaded. Is the server reachable?"
            label="POS Terminal"
          />
          <div className="wizard-centered">
            <button type="button" className="btn btn-primary btn-block" onClick={loadCatalog}>Retry</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main-content" id="mainContent">
      <header className="top-header">
        <div className="header-left">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')}>Done</button>
          <div className="breadcrumb">
            <span className="bc-app">{businessName}</span>
            <span className="bc-sep">/</span>
            <span className="bc-page">POS Terminal</span>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              signOut()
              navigate('/login')
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="content-area" id="contentArea">
        {step < 3 ? renderSteps() : null}

        {step === 1 ? (
          <div className="step-container">
            <div className="pos-layout">
              <div className="pos-main">
                <div className="pos-controls">
                  <div className="pos-search">
                    <input
                      ref={searchRef}
                      type="text"
                      className="form-control"
                      placeholder="Scan barcode or search products…"
                      aria-label="Scan barcode or search products"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleSearchEnter()
                        }
                      }}
                    />
                  </div>
                  <div className="category-filters">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={category === item}
                        className={`btn ${category === item ? 'btn-primary' : 'btn-outline'} btn-xs`}
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="product-grid">
                  {filteredProducts.map((product) => {
                    const stock = stockOf(product.id)
                    const out = stock !== null && stock <= 0
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className="product-card"
                        onClick={() => addToCart(product)}
                        disabled={out}
                      >
                        <div className="product-meta">
                          <strong>{product.name}</strong>
                          <span className="product-cat">{product.category}</span>
                          <span className="product-price">{formatCurrency(product.price)}</span>
                        </div>
                        <div className="product-foot">
                          <span className={`stock-badge ${out ? 'out' : stock !== null && stock < 5 ? 'low' : ''}`}>
                            {stock === null ? 'untracked' : out ? 'out of stock' : `${stock} in stock`}
                          </span>
                          {product.size ? <span className="product-size">{product.size}</span> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <aside className="pos-sidebar">
                <div className="cart-header">
                  <h3>Current Bill</h3>
                  <div className="cart-header-actions">
                    <button type="button" className="btn btn-outline btn-xs" onClick={toggleHolds}>
                      Parked ({holds.length})
                    </button>
                    <span className="badge">{cartCount}</span>
                  </div>
                </div>

                {holdsOpen ? (
                  <div className="held-panel">
                    {holdsLoading ? <p className="cart-empty">Loading…</p> : null}
                    {!holdsLoading && !holds.length ? <p className="cart-empty">No parked bills.</p> : null}
                    {holds.map((hold) => (
                      <div key={hold.id} className="held-row">
                        <div className="held-info">
                          <strong>{hold.label}</strong>
                          <span className="text-muted">{hold.id}</span>
                        </div>
                        <div className="held-actions">
                          <button type="button" className="btn btn-outline btn-xs" onClick={() => resumeHold(hold)}>Resume</button>
                          <button type="button" className="btn btn-outline btn-xs" onClick={() => discardHold(hold)}>Discard</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="cart-body">
                  {cart.length ? cart.map((item) => (
                    <div key={item.productId} className="cart-item">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="text-muted cart-item-price">
                          {formatCurrency(item.price)} × {item.qty}
                        </div>
                      </div>
                      <div className="workspace-qty-row">
                        <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => changeQty(item.productId, -1)}>−</button>
                        <span>{item.qty}</span>
                        <button type="button" aria-label={`Increase ${item.name}`} onClick={() => changeQty(item.productId, 1)}>+</button>
                      </div>
                    </div>
                  )) : <p className="cart-empty">Scan or tap a product to start.</p>}
                </div>

                <div className="cart-footer">
                  {promo ? (
                    <div className="promo-applied">
                      <span>Promo {promo.code} — {formatCurrency(promo.discount)} off</span>
                      <button type="button" className="promo-remove" aria-label="Remove promo" onClick={removePromo}>×</button>
                    </div>
                  ) : (
                    <div className="promo-block">
                      <div className="promo-input">
                        <input
                          className="form-control"
                          placeholder="Promo code"
                          value={promoInput}
                          onChange={(event) => { setPromoInput(event.target.value.toUpperCase()); setPromoError('') }}
                          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyPromo() } }}
                        />
                        <button type="button" className="btn btn-outline" onClick={applyPromo}>Apply</button>
                      </div>
                      {promoError ? <p className="form-error">{promoError}</p> : null}
                    </div>
                  )}
                  <div className="cf-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {discount > 0 ? (
                    <div className="cf-row cf-discount"><span>Discount</span><span>− {formatCurrency(discount)}</span></div>
                  ) : null}
                  <div className="cf-tot"><span>Total</span><span>{formatCurrency(total)}</span></div>
                  <div className="cart-actions">
                    <button type="button" className="btn btn-outline" disabled={!cart.length || submitting} onClick={holdCart}>Park</button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!cart.length || submitting}
                      onClick={() => {
                        setTendered('')
                        setStep(2)
                      }}
                    >
                      Charge {formatCurrency(total)}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="step-container">
            <div className="pay-grid">
              <div className="pay-form">
                <h3>Fulfillment</h3>
                <div className="seg">
                  {MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`seg-btn ${payMode === mode.id ? 'active' : ''}`}
                      aria-pressed={payMode === mode.id}
                      onClick={() => setPayMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                {modeNeedsAddress ? (
                  <div className="form-group">
                    <label className="form-label" htmlFor="posAddress">Delivery Address</label>
                    <textarea id="posAddress" className="form-control" rows="2" value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} />
                  </div>
                ) : null}

                <h3>Payment</h3>
                <div className="seg">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`seg-btn ${payMethod === method ? 'active' : ''}`}
                      aria-pressed={payMethod === method}
                      onClick={() => { setPayMethod(method); setTendered('') }}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {payMethod === 'Cash' && !modeIsCod ? (
                  <div className="tender-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" htmlFor="posTendered">Cash Received</label>
                      <input
                        id="posTendered"
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={String(total)}
                        value={tendered}
                        onChange={(event) => setTendered(event.target.value)}
                      />
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => setTendered(String(total))}>Exact</button>
                    {tendered !== '' && Number(tendered) >= total ? (
                      <div className="change-chip">Change: <strong>{formatCurrency(changeDue)}</strong></div>
                    ) : null}
                    {tendered !== '' && Number(tendered) < total ? (
                      <div className="change-chip short">Short: {formatCurrency(total - Number(tendered))}</div>
                    ) : null}
                  </div>
                ) : null}

                <h3>Customer <span className="text-muted">(optional)</span></h3>
                <div className="customer-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="posPhone">Phone (10 digits)</label>
                    <input
                      id="posPhone"
                      className="form-control"
                      type="tel"
                      inputMode="numeric"
                      maxLength="10"
                      value={customerPhone}
                      onChange={(event) => handlePhoneLookup(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="posName">Name</label>
                    <input id="posName" className="form-control" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                  </div>
                </div>
                {lookupState === 'found' ? (
                  <p className="lookup-note found">Saved customer — details filled from their profile.</p>
) : null}
                {lookupState === 'new' ? (
                  <p className="lookup-note">New customer — a profile will be created with this sale.</p>
                ) : null}
              </div>

              <aside className="pay-summary">
                <div className="pay-summary-card">
                  <div className="checkout-summary-row"><span>{cartCount} item{cartCount === 1 ? '' : 's'}</span><span /></div>
                  <div className="checkout-summary-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {discount > 0 ? (
                    <div className="checkout-summary-row cf-discount"><span>Discount ({promo?.code})</span><span>− {formatCurrency(discount)}</span></div>
                  ) : null}
                  <div className="checkout-summary-row total"><span>To Pay</span><span>{formatCurrency(total)}</span></div>
                  {modeIsCod ? <div className="checkout-summary-row"><span>Collection</span><span>Cash on delivery</span></div> : null}
                  {payMethod !== 'Cash' || modeIsCod ? null : (
                    <div className="checkout-summary-row"><span>Change to return</span><span>{formatCurrency(changeDue)}</span></div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-block pay-cta"
                  disabled={submitting || (modeNeedsAddress && !customerAddress.trim())}
                  onClick={completeSale}
                >
                  {submitting ? 'Completing…' : `Complete Sale — ${formatCurrency(total)}`}
                </button>
                <button type="button" className="btn btn-outline btn-block" onClick={() => setStep(1)}>Back to Cart</button>
              </aside>
            </div>
          </div>
        ) : null}

        {step === 3 && result ? (
          <div className="step-container">
            <div className="wizard-centered success-block">
              <div className="success-icon">✓</div>
              <h2>Sale Complete</h2>
              <p className="text-muted">
                {result.stage === 'complete' ? 'Stock updated and payment recorded.' : 'The sale was saved with an issue — see below.'}
              </p>
              <section className="card checkout-summary-card">
                <div className="card-bd">
                  <div className="checkout-summary-row"><span>Order</span><span className="mono-num">{result.order.id}</span></div>
                  {result.billNo ? <div className="checkout-summary-row"><span>Bill</span><span className="mono-num">{result.billNo}</span></div> : null}
                  <div className="checkout-summary-row"><span>Amount</span><span className="mono-num">{formatCurrency(result.order.total)}</span></div>
                  <div className="checkout-summary-row"><span>Method</span><span>{result.method}</span></div>
                  {!modeIsCod && result.stage === 'complete' ? (
                    <>
                      <div className="checkout-summary-row"><span>Tendered</span><span className="mono-num">{formatCurrency(result.tendered)}</span></div>
                      {result.change > 0 ? (
                        <div className="checkout-summary-row"><span>Change due</span><span className="mono-num">{formatCurrency(result.change)}</span></div>
                      ) : null}
                    </>
                  ) : null}
                  {result.stage === 'complete' && result.balanceDue > 0 ? (
                    <div className="checkout-summary-row"><span>Balance</span><span className="mono-num">{formatCurrency(result.balanceDue)}</span></div>
                  ) : null}
                </div>
              </section>
              {result.stage !== 'complete' ? (
                <p className="form-error">Payment could not be recorded. Order {result.order.id} exists — settle it from Orders → Payments.</p>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={resetFlow}>New Sale</button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default CashierPage
