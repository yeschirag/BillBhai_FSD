import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiProvider } from '../api/index.js'
import { useAuth } from '../context/useAuth.js'
import { formatCurrency } from '../services/workspaceService.js'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

/**
 * High-Speed POS Terminal for Indian Retail
 * Real-time stock sync, active promo recalculation, multi-tender support, and thermal receipts.
 */

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Razorpay']

const PROMO_PRESETS = [
  { code: 'WELCOME10', label: '10% OFF' },
  { code: 'SAVE10', label: '10% OFF' },
  { code: 'SAVE20', label: '20% OFF' },
  { code: 'FLAT50', label: '₹50 OFF' },
  { code: 'BILLBHAI', label: '15% OFF' },
]

// Deterministic icon per product category — no external images, always relevant
const CAT_ICONS = {
  // Food & Grocery
  'General':         '🥡', 'Grocery':       '🛒', 'Food':          '🍔', 'Beverage':     '🥤',
  'Dairy':           '🥛', 'Snacks':         '🍿', 'Fruits':        '🍎', 'Vegetables':   '🥬',
  'Bakery':          '🥐', 'Sweets':         '🍫', 'Tea & Coffee':  '☕', 'Rice & Pulses':'🌾',
  'Spices':          '🌶️', 'Oil & Ghee':     '🫒', 'Personal Care': '🧴', 'Household':    '🧹',
  'Electronics':     '📱', 'Clothing':       '👕', 'Footwear':      '👟', 'Accessories':  '👜',
  'Pharmacy':        '💊', 'Stationery':     '📓', 'Sports':        '⚽', 'Toys':         '🧸',
  'Books':           '📚', 'Kitchen':         '🍳', 'Cleaning':      '🧽', 'Frozen':       '🧊',
}

const EMOJI_POOL = ['🥡','🛒','📦','🏷️','📦','🧾','🛍️','📦','🥡','🛒']

function productIcon(product) {
  const cat = product.category || 'General'
  const icon = CAT_ICONS[cat]
  if (icon) return icon
  // Derive a stable icon from the product name
  const name = (product.name || '')
  if (/rice|dall|pulse|grain|wheat|atta/.test(name))    return '🌾'
  if (/oil|ghee|mustard|sunflower/.test(name))           return '🫒'
  if (/milk|dahi|curd|paneer|cheese|yogurt/.test(name))  return '🥛'
  if (/tea|coffee|chai|green tea/.test(name))            return '☕'
  if (/chocolate|candy|sweet|gulab|barfi|ladoo/.test(name)) return '🍫'
  if (/fruit|mango|apple|banana|grape|orange/.test(name)) return '🍎'
  if (/veg|palak|methi|onion|tomato|potato/.test(name))   return '🥬'
  if (/bread|biscuit|cookie|cake|roti/.test(name))       return '🥐'
  if (/sugar|salt|chilli|turmeric|masala/.test(name))    return '🌶️'
  if (/shampoo|soap|cream|lotion|perfume/.test(name))    return '🧴'
  if (/phone|laptop|charger|earphone|headphone/.test(name)) return '📱'
  if (/shirt|jeans|kurta|pant|saree|frock/.test(name))   return '👕'
  if (/shoes|sandal|slipper|boot|footwear/.test(name))   return '👟'
  if (/bag|wallet|purse|watch|sunglass|ring/.test(name)) return '👜'
  if (/medicine|tablet|syrup|bandage|ayurved/.test(name)) return '💊'
  if (/book|notebook|pen|pencil|sticker/.test(name))      return '📓'
  if (/ball|bat|mat|skip|cricket|football/.test(name))   return '⚽'
  if (/toy|doll|car|robot|puzzle/.test(name))             return '🧸'
  // Fallback: deterministic pick from name chars
  const idx = (product.id || product.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % EMOJI_POOL.length
  return EMOJI_POOL[idx]
}

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

  const [loadState, setLoadState] = useState('loading')
  const [products, setProducts] = useState([])
  const [stockByProduct, setStockByProduct] = useState({})

  const [step, setStep] = useState(1) // 1 cart → 2 pay → 3 done
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null) // { code, discount, label }
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
  const [, setSavedCustomer] = useState(null)
  const [lookupState, setLookupState] = useState('idle') // idle | found | new
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const searchRef = useRef(null)

  useEffect(() => {
    document.title = 'BillBhai - Cashier POS Terminal'
    document.body.setAttribute('data-page', 'cashier')
    document.body.setAttribute('data-app-ready', 'true')
    document.body.classList.add('no-sidebar')
    return () => {
      document.body.removeAttribute('data-page')
      document.body.classList.remove('no-sidebar')
    }
  }, [])

  const businessName = localStorage.getItem('activeBusinessName') || 'BillBhai Store'

  const loadCatalog = async () => {
    setLoadState('loading')
    try {
      const [productsData, inventoryData] = await Promise.all([
        apiProvider.getProducts?.() || [],
        apiProvider.getInventory?.() || [],
      ])
      let list = Array.isArray(productsData) ? productsData : []
      const stockMap = {}
      for (const item of Array.isArray(inventoryData) ? inventoryData : []) {
        if (item?.productId) stockMap[item.productId] = Number(item.stock || 0)
      }

      if (!list.length) {
        const bizData = await apiProvider.getBusinessData?.()
        const activeBizId = localStorage.getItem('activeBusinessId') || 'BIZ-101'
        const bizInventory = bizData?.[activeBizId]?.inventory || []
        if (bizInventory.length) {
          list = bizInventory.map((item) => {
            const id = item.sku || item.id
            stockMap[id] = Number(item.stock || 0)
            return {
              id,
              name: item.name,
              price: Number(item.price || 0),
              category: item.cat || 'General',
            }
          })
        }
      }

      setProducts(list)
      setStockByProduct(stockMap)
      setLoadState('ready')
    } catch (err) {
      console.error('POS: failed to load catalog', err)
      toast.error('Could not load product catalog. Tap retry to try again.')
      setLoadState('error')
    }
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  // ── Derived catalog & category counts ──

  const categories = useMemo(() => {
    const cats = ['All']
    const unique = Array.from(new Set(products.map((p) => p.category || 'General'))).sort()
    return [...cats, ...unique]
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'All' || (product.category || 'General') === category
      const matchesSearch =
        !query
        || String(product.name || '').toLowerCase().includes(query)
        || String(product.id || '').toLowerCase().includes(query)
        || String(product.barcode || '').toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [products, category, search])

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = round2(cart.reduce((sum, item) => sum + item.price * item.qty, 0))
  const discount = promo ? Math.min(promo.discount, subtotal) : 0
  const total = round2(Math.max(0, subtotal - discount))

  // Re-evaluate active promo code whenever subtotal changes
  useEffect(() => {
    if (promo?.code && subtotal > 0) {
      apiProvider.validatePromotion(promo.code, subtotal).then((res) => {
        if (res?.ok && res?.data) {
          const newDiscount = Number(res.data.discount || 0)
          if (promo.discount !== newDiscount) {
            setPromo({
              code: res.data.code,
              discount: newDiscount,
              label: res.data.label || 'Discount Applied',
            })
          }
          setPromoError('')
        } else if (res?.error) {
          setPromoError(res.error)
        }
      }).catch((err) => { console.warn('Promo validation failed', err) })
    } else if (subtotal === 0 && promo) {
      setPromo(null)
      setPromoError('')
    }
  }, [subtotal, promo])

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

  const clearCart = () => {
    setCart([])
    setPromo(null)
    setPromoInput('')
    setPromoError('')
  }

  const handleSearchEnter = async () => {
    const term = search.trim()
    if (!term) return
    const localMatch = products.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === term.toLowerCase())
        || (p.id && p.id.toLowerCase() === term.toLowerCase()),
    )
    const product = localMatch || (await apiProvider.getProductByBarcode(term))
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

  // ── Promo Code Handlers ──

  const applyPromoWithCode = async (codeToApply) => {
    const code = String(codeToApply || '').trim().toUpperCase()
    if (!code) return
    if (subtotal <= 0) {
      setPromoError('Add items to cart before applying promo')
      return
    }
    setPromoError('')
    try {
      const res = await apiProvider.validatePromotion(code, round2(subtotal))
      if (!res.ok) {
        setPromo(null)
        setPromoError(res.error || 'Invalid promo code')
        return
      }
      setPromo({
        code: res.data.code,
        discount: Number(res.data.discount || 0),
        label: res.data.label || 'Discount Applied',
      })
      setPromoInput(res.data.code)
      toast.success(`Coupon ${res.data.code} applied! Saved ${formatCurrency(res.data.discount)}`)
    } catch {
      setPromoError('Could not validate promo code right now')
    }
  }

  const applyPromo = () => applyPromoWithCode(promoInput)

  const removePromo = () => {
    setPromo(null)
    setPromoInput('')
    setPromoError('')
    toast.info('Promo code removed')
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

  const toggleHolds = async () => {
    const next = !holdsOpen
    setHoldsOpen(next)
    if (next) await refreshHolds()
  }

  const holdCart = async () => {
    if (!cart.length) return
    const defaultLabel = customerName.trim()
      || (customerPhone ? `Customer ${customerPhone}` : `Hold ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    const label = window.prompt('Label for this held bill:', defaultLabel)
    if (label === null) return
    setSubmitting(true)
    try {
      const payload = {
        label: label.trim() || defaultLabel,
        cart,
        customerPhone: normalizePhone(customerPhone) || undefined,
        customerName: customerName.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        promoCode: promo?.code || undefined,
      }
      const res = await apiProvider.createHold(payload)
      if (!res.ok) {
        toast.error(res.error || 'Could not hold bill')
        return
      }
      toast.success(`Bill held: ${res.data.label}`)
      setCart([])
      setCustomerPhone('')
      setCustomerName('')
      setCustomerAddress('')
      setPromo(null)
      setPromoInput('')
      setPromoError('')
      await refreshHolds()
    } finally {
      setSubmitting(false)
    }
  }

  const resumeHold = async (hold) => {
    if (!hold?.envelope) return
    if (cart.length && !window.confirm('Replace current cart with held bill?')) return
    const { envelope } = hold
    setCart(Array.isArray(envelope.cart) ? envelope.cart : [])
    setCustomerPhone(envelope.customerPhone || '')
    setCustomerName(envelope.customerName || '')
    setCustomerAddress(envelope.customerAddress || '')
    if (envelope.promoCode) {
      setPromoInput(envelope.promoCode)
      applyPromoWithCode(envelope.promoCode)
    }
    setHoldsOpen(false)
    await apiProvider.deleteHold(hold.id)
    await refreshHolds()
    toast.success(`Resumed ${hold.label}`)
  }

  const discardHold = async (hold) => {
    if (!window.confirm(`Discard held bill "${hold.label}"?`)) return
    await apiProvider.deleteHold(hold.id)
    await refreshHolds()
    toast.info('Held bill discarded')
  }

  // ── Customer lookup ──

  const handlePhoneLookup = async (value) => {
    const cleaned = normalizePhone(value)
    setCustomerPhone(cleaned)
    if (cleaned.length !== 10) {
      setSavedCustomer(null)
      setLookupState('idle')
      return
    }
    const customer = await apiProvider.getCustomerByPhone(cleaned)
    if (customer) {
      setSavedCustomer(customer)
      setCustomerName(customer.name || '')
      if (customer.address && !customerAddress) setCustomerAddress(customer.address)
      setLookupState('found')
    } else {
      setSavedCustomer(null)
      setLookupState('new')
    }
  }

  // ── Checkout & Settlement ──

  const selectedMode = MODES.find((m) => m.id === payMode) || MODES[0]
  const modeNeedsAddress = Boolean(selectedMode.needsAddress)
  const modeIsCod = Boolean(selectedMode.cod)

  const changeDue = useMemo(() => {
    if (payMethod !== 'Cash' || modeIsCod) return 0
    const numTendered = Number(tendered)
    if (Number.isNaN(numTendered) || numTendered <= total) return 0
    return round2(numTendered - total)
  }, [payMethod, modeIsCod, tendered, total])

  const completeSale = async () => {
    if (!cart.length) return
    if (modeNeedsAddress && !customerAddress.trim()) {
      toast.error('Delivery address is required for delivery orders')
      return
    }
    const numTendered = Number(tendered)
    if (payMethod === 'Cash' && !modeIsCod && tendered !== '' && numTendered < total) {
      toast.error(`Tendered amount (₹${numTendered}) is less than total (₹${total})`)
      return
    }

    setSubmitting(true)
    try {
      let customerId
      const phoneDigits = normalizePhone(customerPhone)
      if (phoneDigits.length === 10) {
        const payload = {
          phone: phoneDigits,
          name: customerName.trim() || 'Walk-in Customer',
          address: customerAddress.trim() || undefined,
        }
        const custRes = await apiProvider.createOrUpdateCustomer(payload)
        if (custRes?.ok && custRes.data?.id) {
          customerId = custRes.data.id
        }
      }

      const orderPayload = {
        customerId,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.qty,
          itemPrice: Number(i.price || 0),
          price: Number(i.price || 0),
        })),
        promoCode: promo?.code || '',
        orderType: selectedMode.orderType,
        checkoutMode: selectedMode.checkoutMode,
        deliveryAddress: modeNeedsAddress ? customerAddress.trim() : undefined,
      }

      const orderRes = await apiProvider.createOrder(orderPayload)
      if (!orderRes.ok) {
        toast.error(orderRes.error || 'Could not place order')
        return
      }

      const order = orderRes.data
      const billRes = await apiProvider.createBill({
        orderId: order.id,
        tenderType: payMethod,
        orderType: selectedMode.orderType,
      })
      const billNo = billRes?.ok ? billRes.data?.billNo : null

      let paymentResult = null
      let stage = 'complete'

      if (!modeIsCod) {
        const paymentAmount = total
        const payPayload = {
          billNo: billNo || order.id,
          amount: paymentAmount,
          method: payMethod,
          tendered: payMethod === 'Cash' && tendered ? numTendered : undefined,
          change: payMethod === 'Cash' && changeDue > 0 ? changeDue : undefined,
        }
        const payFn = apiProvider.recordPayment || apiProvider.createPayment
        const payRes = await payFn?.call(apiProvider, payPayload)
        if (payRes?.ok) {
          paymentResult = payRes.data
        } else {
          stage = 'payment_pending'
        }
      }

      setResult({
        order,
        billNo,
        payment: paymentResult,
        stage,
        method: modeIsCod ? 'COD' : payMethod,
        tendered: payMethod === 'Cash' && tendered ? numTendered : total,
        change: changeDue,
        balanceDue: paymentResult?.balanceDue || 0,
      })
      setStep(3)
      toast.success(`Sale completed: ${billNo || order.id}`)
    } catch (err) {
      console.error('POS Checkout failed', err)
      toast.error('Unexpected error while finishing the sale')
    } finally {
      setSubmitting(false)
    }
  }

  const resetFlow = () => {
    setCart([])
    setPromo(null)
    setPromoInput('')
    setPromoError('')
    setCustomerPhone('')
    setCustomerName('')
    setCustomerAddress('')
    setSavedCustomer(null)
    setLookupState('idle')
    setTendered('')
    setResult(null)
    setStep(1)
  }

  const renderSteps = () => (
    <div className="pos-step-indicator">
      <span className={`pos-step-pill ${step >= 1 ? 'active' : ''}`}>1. Cart ({cartCount})</span>
      <span className="pos-step-arrow">→</span>
      <span className={`pos-step-pill ${step >= 2 ? 'active' : ''}`}>2. Tender ({formatCurrency(total)})</span>
      <span className="pos-step-arrow">→</span>
      <span className={`pos-step-pill ${step >= 3 ? 'active' : ''}`}>3. Receipt</span>
    </div>
  )

  if (loadState === 'loading') {
    return (
      <main className="main-content pos-main-content">
        <PageState variant="loading" title="Opening POS Register…" message="Syncing real-time catalog & stock balances from PostgreSQL." />
      </main>
    )
  }

  return (
    <main className="main-content pos-main-content" id="mainContent">
      {/* Top Header */}
      <header className="pos-top-header">
        <div className="pos-header-left">
          {user?.role === 'admin' || user?.role === 'superuser' ? (
            <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm pos-neu-btn-back" onClick={() => navigate('/dashboard')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Dashboard</span>
            </button>
          ) : null}
          <div className="pos-brand-pill">
            <span className="pos-brand-dot" />
            <span className="pos-brand-name">{businessName}</span>
            <span className="pos-brand-tag">Terminal #1 Live</span>
          </div>
        </div>

        <div className="pos-header-center">
          {step < 3 ? renderSteps() : null}
        </div>

        <div className="pos-header-right">
          <div className="pos-user-badge">
            <span className="pos-user-avatar">{String(user?.name || 'C').charAt(0).toUpperCase()}</span>
            <span className="pos-user-name">{user?.name || 'Cashier'}</span>
          </div>
          <button
            type="button"
            className="neu-btn neu-btn--secondary neu-btn--sm pos-neu-btn-logout"
            onClick={() => {
              signOut()
              navigate('/login')
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Exit</span>
          </button>
        </div>
      </header>

      <div className="pos-content-area" id="contentArea">
        {step === 1 ? (
          <div className="step-container">
            <div className="pos-layout">
              {/* Main Product Catalog */}
              <div className="pos-main">
                <div className="pos-controls">
                  <div className="pos-search">
                    <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      ref={searchRef}
                      type="text"
                      className="form-control pos-search-input"
                      placeholder="Scan barcode or search items (Press Enter to add)…"
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
                    {search ? (
                      <button type="button" className="search-clear-neu-btn" onClick={() => setSearch('')}>×</button>
                    ) : null}
                  </div>
                  <div className="category-filters">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={category === item}
                        className={`cat-pill ${category === item ? 'active' : ''}`}
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
                    const inCart = cart.find((i) => i.productId === product.id)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`product-card ${out ? 'disabled' : ''} ${inCart ? 'in-cart' : ''}`}
                        onClick={() => addToCart(product)}
                        disabled={out}
                      >
                        <div className="product-neu-card-top" style={{ position: 'relative' }}>
                          <div
                            className="product-icon-tile"
                            aria-hidden="true"
                            style={{
                              width: 56, height: 56, borderRadius: 10,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.6rem',
                              boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.15), inset -2px -2px 6px rgba(255,255,255,0.7)',
                              flexShrink: 0,
                            }}
                          >
                            {productIcon(product)}
                          </div>
                          <span className="product-cat">{product.category || 'General'}</span>
                          <span className={`stock-badge ${out ? 'out-of-stock' : stock !== null && stock < 5 ? 'low-stock' : 'in-stock'}`}>
                            <span className="stock-dot" />
                            {stock === null ? 'untracked' : out ? 'Out of stock' : `${stock} left`}
                          </span>
                        </div>
                        <div className="product-meta" style={{ flex: 1, minWidth: 0 }}>
                          <strong className="product-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</strong>
                          {product.size ? <span className="product-size">{product.size}</span> : null}
                        </div>
                        <div className="product-foot">
                          <span className="product-price">{formatCurrency(product.price)}</span>
                          <span className="product-add-neu-btn">
                            {inCart ? `+ Add (${inCart.qty})` : '+ Add'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* POS Cart Sidebar */}
              <aside className="pos-sidebar">
                <div className="cart-header">
                  <div className="cart-header-title">
                    <h3>Current Bill</h3>
                    <span className="cart-badge-count">{cartCount} items</span>
                  </div>
                  <div className="cart-header-actions">
                    <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={toggleHolds}>
                      Parked ({holds.length})
                    </button>
                    {cart.length ? (
                      <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm neu-btn-clear-cart" onClick={clearCart}>
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                {holdsOpen ? (
                  <div className="held-panel">
                    {holdsLoading ? <p className="cart-empty">Loading parked bills…</p> : null}
                    {!holdsLoading && !holds.length ? <p className="cart-empty">No parked bills.</p> : null}
                    {holds.map((hold) => (
                      <div key={hold.id} className="held-row">
                        <div className="held-info">
                          <strong>{hold.label}</strong>
                          <span className="text-muted">{hold.id}</span>
                        </div>
                        <div className="held-actions">
                          <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => resumeHold(hold)}>Resume</button>
                          <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => discardHold(hold)}>Discard</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="cart-body">
                  {cart.length ? (
                    cart.map((item) => (
                      <div key={item.productId} className="cart-item">
                        <div className="cart-item-details">
                          <strong>{item.name}</strong>
                          <div className="cart-item-price">
                            {formatCurrency(item.price)} × {item.qty} = <span className="mono-num">{formatCurrency(item.price * item.qty)}</span>
                          </div>
                        </div>
                        <div className="workspace-qty-row">
                          <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => changeQty(item.productId, -1)}>
                            {item.qty === 1 ? '✕' : '−'}
                          </button>
                          <span className="qty-num">{item.qty}</span>
                          <button type="button" aria-label={`Increase ${item.name}`} onClick={() => changeQty(item.productId, 1)}>+</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="cart-empty-state">
                      <div className="cart-empty-icon">🛒</div>
                      <p>Scan barcode or tap any product to start building the bill.</p>
                    </div>
                  )}
                </div>

                <div className="cart-footer">
                  {/* Promo Section with Presets */}
                  {promo ? (
                    <div className="promo-applied">
                      <div className="promo-applied-info">
                        <span className="promo-tag-icon">🏷️</span>
                        <div>
                          <strong>{promo.code}</strong>
                          <span className="promo-discount-val">− {formatCurrency(discount)}</span>
                        </div>
                      </div>
                      <button type="button" className="promo-remove" aria-label="Remove promo" onClick={removePromo}>×</button>
                    </div>
                  ) : (
                    <div className="promo-block">
                      <div className="promo-input-group">
                        <input
                          className="form-control promo-text-field"
                          placeholder="Promo code (e.g. WELCOME10)"
                          value={promoInput}
                          onChange={(event) => { setPromoInput(event.target.value.toUpperCase()); setPromoError('') }}
                          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyPromo() } }}
                        />
                        <button type="button" className="neu-btn neu-btn--primary neu-btn--sm" onClick={applyPromo}>
                          Apply
                        </button>
                      </div>

                      {/* Quick Clickable Promo Pills */}
                      <div className="promo-preset-pills">
                        {PROMO_PRESETS.map((preset) => (
                          <button
                            key={preset.code}
                            type="button"
                            className="promo-chip"
                            onClick={() => applyPromoWithCode(preset.code)}
                          >
                            <strong>{preset.code}</strong> ({preset.label})
                          </button>
                        ))}
                      </div>

                      {promoError ? <p className="promo-error-msg" role="alert" aria-live="polite">⚠️ {promoError}</p> : null}
                    </div>
                  )}

                  {/* Summary Breakdown */}
                  <div className="bill-breakdown">
                    <div className="cf-row"><span>Subtotal ({cartCount} items)</span><span>{formatCurrency(subtotal)}</span></div>
                    {discount > 0 ? (
                      <div className="cf-row cf-discount">
                        <span>Coupon Discount ({promo?.code})</span>
                        <span>− {formatCurrency(discount)}</span>
                      </div>
                    ) : null}
                    <div className="cf-tot">
                      <span>Net Payable</span>
                      <span className="cf-tot-amount">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="cart-actions">
                    <button type="button" className="neu-btn neu-btn--secondary" disabled={!cart.length || submitting} onClick={holdCart}>
                      Park (Hold)
                    </button>
                    <button
                      type="button"
                      className="neu-btn neu-btn--primary"
                      disabled={!cart.length || submitting}
                      onClick={() => {
                        setTendered('')
                        setStep(2)
                      }}
                    >
                      Charge {formatCurrency(total)} →
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : null}

        {/* Step 2: Payment & Tender Drawer */}
        {step === 2 ? (
          <div className="step-container">
            <div className="pay-grid">
              <div className="pay-form">
                <div className="pay-form-section">
                  <h3 className="section-subtitle">1. Fulfillment Mode</h3>
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
                    <div className="form-group" style={{ marginTop: '14px' }}>
                      <label className="form-label" htmlFor="posAddress">Delivery Address *</label>
                      <textarea
                        id="posAddress"
                        className="form-control"
                        rows="2"
                        placeholder="House / Flat No, Street, Landmark, PIN code"
                        value={customerAddress}
                        onChange={(event) => setCustomerAddress(event.target.value)}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="pay-form-section">
                  <h3 className="section-subtitle">2. Tender Method</h3>
                  <div className="seg">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`seg-btn ${payMethod === method ? 'active' : ''}`}
                        aria-pressed={payMethod === method}
                        onClick={() => { setPayMethod(method); setTendered('') }}
                      >
                        {method === 'UPI' ? '📱 UPI / QR Code' : method === 'Card' ? '💳 Card' : method === 'Razorpay' ? '⚡ Razorpay' : '💵 Cash'}
                      </button>
                    ))}
                  </div>

                  {payMethod === 'UPI' && !modeIsCod ? (
                    <div className="upi-qr-box">
                      <div className="upi-qr-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="7" y1="7" x2="7.01" y2="7"/><line x1="17" y1="7" x2="17.01" y2="7"/><line x1="7" y1="17" x2="7.01" y2="17"/><line x1="17" y1="17" x2="17.01" y2="17"/></svg>
                      </div>
                      <div className="upi-qr-details">
                        <strong>Scan to pay with any UPI App</strong>
                        <p>GPay, PhonePe, Paytm, BHIM</p>
                        <span className="upi-amount-pill">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  ) : null}

                  {payMethod === 'Razorpay' && !modeIsCod ? (
                    <div className="upi-qr-box razorpay-qr-box">
                      <div className="razorpay-brand">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0564AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
                        <strong style={{ color: '#0564AF', fontSize: '1rem' }}>Razorpay</strong>
                      </div>
                      <div className="upi-qr-placeholder razorpay-qr">
                        <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="7" y1="7" x2="7.01" y2="7"/><line x1="17" y1="7" x2="17.01" y2="7"/><line x1="7" y1="17" x2="7.01" y2="17"/><line x1="17" y1="17" x2="17.01" y2="17"/></svg>
                      </div>
                      <div className="upi-qr-details">
                        <strong>Pay via Razorpay</strong>
                        <p>UPI, Cards, Net Banking, Wallets</p>
                        <span className="upi-amount-pill">{formatCurrency(total)}</span>
                      </div>
                      <p className="razorpay-note">Payment captured via Razorpay · Instant settlement</p>
                    </div>
                  ) : null}

                  {payMethod === 'Cash' && !modeIsCod ? (
                    <div className="tender-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="posTendered">Cash Received from Customer</label>
                        <input
                          id="posTendered"
                          className="form-control pos-tendered-input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={String(total)}
                          value={tendered}
                          onChange={(event) => setTendered(event.target.value)}
                        />
                        <div className="tender-presets">
                          <button type="button" className="neu-btn-preset" onClick={() => setTendered(String(total))}>Exact (₹{total})</button>
                          <button type="button" className="neu-btn-preset" onClick={() => setTendered(String(Math.ceil(total / 100) * 100))}>₹{Math.ceil(total / 100) * 100}</button>
                          <button type="button" className="neu-btn-preset" onClick={() => setTendered(String(Math.ceil(total / 500) * 500 || 500))}>₹{Math.ceil(total / 500) * 500 || 500}</button>
                          <button type="button" className="neu-btn-preset" onClick={() => setTendered('500')}>₹500</button>
                          <button type="button" className="neu-btn-preset" onClick={() => setTendered('2000')}>₹2000</button>
                        </div>
                      </div>
                      {tendered !== '' && Number(tendered) >= total ? (
                        <div className="change-chip">Change to return: <strong>{formatCurrency(changeDue)}</strong></div>
                      ) : null}
                      {tendered !== '' && Number(tendered) < total ? (
                        <div className="change-chip short">Short amount: {formatCurrency(total - Number(tendered))}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="pay-form-section">
                  <h3 className="section-subtitle">3. Customer Profile <span className="text-muted">(optional)</span></h3>
                  <div className="customer-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="posPhone">Phone (10 digits)</label>
                      <input
                        id="posPhone"
                        className="form-control"
                        type="tel"
                        inputMode="numeric"
                        maxLength="10"
                        placeholder="e.g. 9876543210"
                        value={customerPhone}
                        onChange={(event) => handlePhoneLookup(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="posName">Customer Name</label>
                      <input id="posName" className="form-control" placeholder="Customer Name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                    </div>
                  </div>
                  {lookupState === 'found' ? (
                    <p className="lookup-note found">✓ Saved customer — details loaded automatically.</p>
                  ) : null}
                  {lookupState === 'new' ? (
                    <p className="lookup-note">● New customer — profile will be created upon sale.</p>
                  ) : null}
                </div>
              </div>

              {/* Payment Summary Box */}
              <aside className="pay-summary">
                <div className="pay-summary-neu-card">
                  <h3 className="pay-summary-title">Order Bill Summary</h3>
                  <div className="checkout-summary-row"><span>Items Count</span><span>{cartCount} items</span></div>
                  <div className="checkout-summary-row"><span>Cart Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {discount > 0 ? (
                    <div className="checkout-summary-row cf-discount">
                      <span>Discount ({promo?.code})</span>
                      <span>− {formatCurrency(discount)}</span>
                    </div>
                  ) : null}
                  <div className="checkout-summary-row total"><span>Net Payable</span><span className="mono-num">{formatCurrency(total)}</span></div>
                  {modeIsCod ? <div className="checkout-summary-row"><span>Settlement</span><span>Cash on Delivery</span></div> : null}
                  {payMethod === 'Cash' && !modeIsCod && changeDue > 0 ? (
                    <div className="checkout-summary-row change-line">
                      <span>Change to return</span>
                      <strong className="mono-num">{formatCurrency(changeDue)}</strong>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="neu-btn neu-btn--primary neu-btn-block pay-cta"
                  disabled={submitting || (modeNeedsAddress && !customerAddress.trim())}
                  onClick={completeSale}
                >
                  {submitting ? 'Recording Sale…' : `Complete Sale — ${formatCurrency(total)}`}
                </button>
                <button type="button" className="neu-btn neu-btn--secondary neu-btn-block" onClick={() => setStep(1)}>
                  ← Back to Cart
                </button>
              </aside>
            </div>
          </div>
        ) : null}

        {/* Step 3: Receipt & Success Screen */}
        {step === 3 && result ? (
          <div className="step-container">
            <div className="wizard-centered success-block">
              <div className="pos-success-check">✓</div>
              <h2>Sale Successfully Completed!</h2>
              <p className="text-muted">
                {result.stage === 'complete' ? 'Inventory atomically updated and payment recorded in PostgreSQL.' : 'The sale was saved — see payment details below.'}
              </p>

              <section className="thermal-receipt-neu-card">
                <div className="receipt-header">
                  <h3>{businessName}</h3>
                  <p>Tax Invoice · GSTIN: 29ABCDE1234F1Z5</p>
                  <p className="receipt-date">{new Date().toLocaleString()}</p>
                </div>
                <div className="receipt-divider" />
                <div className="receipt-rows">
                  <div className="checkout-summary-row"><span>Order ID</span><span className="mono-num">{result.order.id}</span></div>
                  {result.billNo ? <div className="checkout-summary-row"><span>Bill No</span><span className="mono-num">{result.billNo}</span></div> : null}
                  <div className="checkout-summary-row"><span>Payment Mode</span><span>{result.method}</span></div>
                  <div className="checkout-summary-row total"><span>Total Amount</span><span className="mono-num">{formatCurrency(result.order.total)}</span></div>
                  {!modeIsCod && result.stage === 'complete' && result.change > 0 ? (
                    <div className="checkout-summary-row"><span>Change Returned</span><span className="mono-num">{formatCurrency(result.change)}</span></div>
                  ) : null}
                </div>
                <div className="receipt-divider" />
                <p className="receipt-footer-msg">Thank you for shopping with us!</p>
              </section>

              <div className="pos-receipt-actions">
                <button type="button" className="neu-btn neu-btn--secondary" onClick={() => window.print()}>
                  🖨️ Print Receipt
                </button>
                <button type="button" className="neu-btn neu-btn--primary" onClick={resetFlow}>
                  ⚡ Start Next Sale (Enter)
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default CashierPage
