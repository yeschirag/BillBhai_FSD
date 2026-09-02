import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function LandingPage() {
  const [isNavScrolled, setIsNavScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('pos')
  const [faqOpen, setFaqOpen] = useState(null)

  useEffect(() => {
    document.title = 'BillBhai - Billing, Inventory & Delivery for Indian Retail'
    document.body.classList.remove('no-sidebar')
    document.body.classList.add('landing-page')
    document.body.removeAttribute('data-page')
    document.body.setAttribute('data-app-ready', 'true')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return () => {
      document.body.classList.remove('landing-page')
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const toggleFaq = (index) => {
    setFaqOpen((prev) => (prev === index ? null : index))
  }

  return (
    <>
      {/* Navigation */}
      <nav className={`navbar${isNavScrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">
            <img src="/logo.png" alt="BillBhai" className="nav-logo-img" />
          </Link>
          <div className={`nav-links${isMobileMenuOpen ? ' open' : ''}`} id="navLinks">
            <a href="#features" className="nav-link" onClick={closeMobileMenu}>Features</a>
            <a href="#interactive-preview" className="nav-link" onClick={closeMobileMenu}>Live Preview</a>
            <a href="#how-it-works" className="nav-link" onClick={closeMobileMenu}>How It Works</a>
            <a href="#faq" className="nav-link" onClick={closeMobileMenu}>FAQ</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="neu-btn neu-neu-btn--ghost" id="navSignInBtn">Sign In</Link>
            <Link to="/register-business" className="neu-btn neu-neu-btn--primary" id="navPrimaryBtn">Get Started Free</Link>
          </div>
          <button
            type="button"
            className={`mobile-toggle${isMobileMenuOpen ? ' open' : ''}`}
            id="mobileToggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="navLinks"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-layout">
            <div className="hero-copy">
              <div className="hero-badge">
                <span className="badge-dot" />
                <span>Next-Gen Indian Retail Operating System</span>
              </div>
              <h1 className="hero-title">
                Run your entire counter <span className="hero-accent">lightning fast</span>
              </h1>
              <p className="hero-subtitle">
                High-speed POS billing, real-time stock sync across shelves, and delivery rider dispatches for Indian retail — wired together so nothing falls out of sync.
              </p>

              <div className="hero-pills" aria-label="Core product capabilities">
                <span className="hero-pill">⚡ 1-Sec GST Billing</span>
                <span className="hero-pill">📦 Live Stock Sync</span>
                <span className="hero-pill">🚚 Rider Tracking</span>
                <span className="hero-pill">👥 Role Logins</span>
              </div>

              <div className="hero-cta">
                <Link to="/register-business" className="neu-btn neu-btn--primary neu-neu-btn--lg" id="heroPrimaryBtn">
                  Create your workspace
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <Link to="/login" className="neu-btn neu-btn--secondary neu-neu-btn--lg">
                  Test Live Demo
                </Link>
              </div>

              <div className="hero-trust-proof">
                <div className="trust-stat">
                  <strong>100%</strong>
                  <span>Offline Resilient</span>
                </div>
                <div className="trust-sep" />
                <div className="trust-stat">
                  <strong>&lt; 1.2s</strong>
                  <span>Per Counter Bill</span>
                </div>
                <div className="trust-sep" />
                <div className="trust-stat">
                  <strong>0 ₹</strong>
                  <span>Free in Beta</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="dashboard-preview">
                <div className="preview-topbar">
                  <div className="preview-dots">
                    <span /><span /><span />
                  </div>
                  <span className="preview-url">billbhai.com/counter/pos</span>
                  <div className="preview-badge-live">● LIVE POS</div>
                </div>
                <div className="preview-body">
                  <div className="preview-sidebar">
                    <div className="ps-item active">Dashboard</div>
                    <div className="ps-item">POS Counter</div>
                    <div className="ps-item">Live Orders</div>
                    <div className="ps-item">Stock Alert</div>
                    <div className="ps-item">Reports</div>
                  </div>
                  <div className="preview-content">
                    <div className="pc-stat-row">
                      <div className="pc-stat">
                        <div className="pc-stat-icon red">₹</div>
                        <div className="pc-stat-text">
                          <span className="pc-label">Today&apos;s Revenue</span>
                          <span className="pc-val">₹48,920</span>
                        </div>
                      </div>
                      <div className="pc-stat">
                        <div className="pc-stat-icon blue">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        </div>
                        <div className="pc-stat-text">
                          <span className="pc-label">Bills Ring</span>
                          <span className="pc-val">142</span>
                        </div>
                      </div>
                      <div className="pc-stat">
                        <div className="pc-stat-icon amber">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div className="pc-stat-text">
                          <span className="pc-label">Low Stock</span>
                          <span className="pc-val">4 SKUs</span>
                        </div>
                      </div>
                    </div>

                    <div className="pc-chart">
                      <svg viewBox="0 0 300 80" className="chart-line" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(239,68,68,0.25)" />
                            <stop offset="100%" stopColor="rgba(239,68,68,0)" />
                          </linearGradient>
                        </defs>
                        <path className="chart-stroke" d="M0,60 Q30,55 60,40 T120,25 T180,30 T240,10 T300,15" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                        <path className="chart-fill" d="M0,60 Q30,55 60,40 T120,25 T180,30 T240,10 T300,15 L300,80 L0,80 Z" fill="url(#chartGrad)" />
                      </svg>
                    </div>

                    <div className="pc-table">
                      <div className="pc-row">
                        <span className="pc-order">ORD-4831</span>
                        <span className="pc-customer">Meera Shah</span>
                        <span className="pc-amount">₹1,240</span>
                        <span className="pc-badge red">Paid · UPI</span>
                      </div>
                      <div className="pc-row">
                        <span className="pc-order">ORD-4830</span>
                        <span className="pc-customer">Arjun Rao</span>
                        <span className="pc-amount">₹860</span>
                        <span className="pc-badge blue">Dispatched</span>
                      </div>
                      <div className="pc-row">
                        <span className="pc-order">ORD-4829</span>
                        <span className="pc-customer">S. Gupta Store</span>
                        <span className="pc-amount">₹2,410</span>
                        <span className="pc-badge amber">In Transit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Tabs / Live Preview Section */}
      <section className="interactive-section" id="interactive-preview">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Experience the 3 core pillars</h2>
            <p className="section-desc">Designed for the real speed of Indian retail counters — tap to explore each surface.</p>
          </div>

          <div className="interactive-tab-bar">
            <button
              type="button"
              className={`tab-pill ${activeTab === 'pos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pos')}
            >
              ⚡ 1-Sec POS Terminal
            </button>
            <button
              type="button"
              className={`tab-pill ${activeTab === 'stock' ? 'active' : ''}`}
              onClick={() => setActiveTab('stock')}
            >
              📦 Live Stock &amp; Radar
            </button>
            <button
              type="button"
              className={`tab-pill ${activeTab === 'delivery' ? 'active' : ''}`}
              onClick={() => setActiveTab('delivery')}
            >
              🚚 Delivery &amp; Logistics
            </button>
          </div>

          <div className="interactive-display-neu-card">
            {activeTab === 'pos' ? (
              <div className="tab-pane-content">
                <div className="tab-pane-text">
                  <h3>Lightning Fast Cashier Terminal</h3>
                  <p>Barcode scanner support, keyboard shortcuts, quick cash denomination presets (`Exact`, `+₹100`, `+₹500`, `+₹2000`), split tender, and promo code support built for busy checkouts.</p>
                  <ul className="tab-feature-list">
                    <li>✓ GST-ready printable thermal slips &amp; invoices</li>
                    <li>✓ Park / Hold multiple customers in line</li>
                    <li>✓ Auto customer profile lookup by mobile number</li>
                  </ul>
                  <Link to="/login" className="neu-btn neu-btn--primary neu-neu-btn--sm">Try POS Terminal →</Link>
                </div>
                <div className="tab-pane-visual">
                  <div className="demo-pos-snippet">
                    <div className="demo-pos-head">
                      <span>Current Cart (3 items)</span>
                      <span className="mono-num">₹1,420</span>
                    </div>
                    <div className="demo-pos-row"><span>Basmati Rice (5kg)</span><span>₹380</span></div>
                    <div className="demo-pos-row"><span>Amul Butter (500g)</span><span>₹275</span></div>
                    <div className="demo-pos-row"><span>Atta Flour (5kg)</span><span>₹248</span></div>
                    <div className="demo-pos-tender">
                      <span className="demo-preset">Exact</span>
                      <span className="demo-preset">₹500</span>
                      <span className="demo-preset">₹2000</span>
                      <span className="demo-charge">Charge ₹1,420</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'stock' ? (
              <div className="tab-pane-content">
                <div className="tab-pane-text">
                  <h3>Real-Time Inventory &amp; Restock Radar</h3>
                  <p>Every sale instantly decrements stock in PostgreSQL. If a customer returns goods, inventory is automatically restored. Low-stock warnings alert you before products run out.</p>
                  <ul className="tab-feature-list">
                    <li>✓ Multi-category organization &amp; supplier tagging</li>
                    <li>✓ Automated Low-Stock Alert warnings</li>
                    <li>✓ Complete audit trail with stock movement ledger</li>
                  </ul>
                  <Link to="/register-business" className="neu-btn neu-btn--primary neu-neu-btn--sm">Setup Catalog →</Link>
                </div>
                <div className="tab-pane-visual">
                  <div className="demo-stock-snippet">
                    <div className="demo-stock-row"><span className="dot-red" /> <span>Refined Oil (1L)</span> <span className="badge-warn">18 left</span></div>
                    <div className="demo-stock-row"><span className="dot-red" /> <span>Milk (1L)</span> <span className="badge-warn">14 left</span></div>
                    <div className="demo-stock-row"><span className="dot-green" /> <span>Toor Dal (1kg)</span> <span className="badge-ok">230 in stock</span></div>
                    <div className="demo-stock-row"><span className="dot-green" /> <span>Basmati Rice (5kg)</span> <span className="badge-ok">140 in stock</span></div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'delivery' ? (
              <div className="tab-pane-content">
                <div className="tab-pane-text">
                  <h3>Seamless Delivery &amp; Runner Dispatch</h3>
                  <p>Hand orders to in-house delivery staff or courier partners. Track ETA, customer delivery address, contact info, and status transitions from Packing to Delivered.</p>
                  <ul className="tab-feature-list">
                    <li>✓ Assigned delivery partner &amp; phone details</li>
                    <li>✓ Live status chips (Pending, Picked Up, In Transit, Delivered)</li>
                    <li>✓ Cash on Delivery (COD) collection settlement</li>
                  </ul>
                  <Link to="/login" className="neu-btn neu-btn--primary neu-neu-btn--sm">Explore Delivery Ops →</Link>
                </div>
                <div className="tab-pane-visual">
                  <div className="demo-delivery-snippet">
                    <div className="demo-del-neu-card">
                      <div className="del-hd"><span>DEL-551 · Order ORD-4830</span><span className="badge-blue">In Transit</span></div>
                      <p>Customer: Arjun Rao · 14, MG Road, Indiranagar</p>
                      <p className="text-muted">Partner: Ramesh Kumar (+91 98765 43210) · ETA 15 mins</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Features Grid / Clean 3x2 Matrix */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything your store needs, zero bloat</h2>
            <p className="section-desc">Engineered for kirana stores, supermarkets, pharmacies, apparel shops, and retail chains across India.</p>
          </div>
          <div className="features-grid">
            <div className="feature-neu-card">
              <div className="feature-icon red">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h3>GST Smart Invoicing</h3>
              <p>Ring up orders and hand over compliant bills with auto-calculated CGST, SGST, IGST, discounts, and promo codes. Support for thermal receipt printers.</p>
            </div>
            <div className="feature-neu-card">
              <div className="feature-icon blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <h3>Atomic Stock Decrement</h3>
              <p>Every bill updates stock atomically. Insufficient quantities fail safely without corrupting accounts.</p>
            </div>
            <div className="feature-neu-card">
              <div className="feature-icon amber">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <h3>Delivery &amp; Runner Ops</h3>
              <p>Dispatch orders to delivery staff and track live status from packaging to doorstep delivery.</p>
            </div>
            <div className="feature-neu-card">
              <div className="feature-icon purple">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>Scoped Role Logins</h3>
              <p>Cashiers bill, inventory leads manage stock, runners deliver, and admins get 360-degree analytics.</p>
            </div>
            <div className="feature-neu-card">
              <div className="feature-icon green">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3>Visual Sales Trends</h3>
              <p>High-resolution Area charts, hourly sales volume, and operations mix without slow spreadsheet exports.</p>
            </div>
            <div className="feature-neu-card">
              <div className="feature-icon red">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </div>
              <h3>Hassle-Free Returns</h3>
              <p>Process customer returns smoothly: inventory is replenished, refunds are tracked, and ledger stays balanced.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">From sign-up to first bill in 60 seconds</h2>
            <p className="section-desc">No complicated installation or training needed. If your team can use a smartphone, they can use BillBhai.</p>
          </div>
          <div className="steps-grid">
            <div className="step-neu-card">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3>Register your business</h3>
                <p>Enter your store name, business type, and GST info to provision your dedicated cloud workspace.</p>
              </div>
            </div>
            <div className="step-neu-card">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3>Load products &amp; staff</h3>
                <p>Import catalog items with prices and stock quantities, then assign roles to your counter staff.</p>
              </div>
            </div>
            <div className="step-neu-card">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3>Start billing &amp; scaling</h3>
                <p>Open the POS terminal, scan or tap products, and ring up sales with instant stock sync.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" id="faq">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-desc">Everything you need to know about BillBhai retail OS.</p>
          </div>
          <div className="faq-grid">
            {[
              {
                q: 'Does BillBhai work on any laptop, tablet, or touch terminal?',
                a: 'Yes! BillBhai runs in any modern browser on Windows, Mac, iPad, Android tablets, and dedicated POS touchscreen terminals.',
              },
              {
                q: 'Can I connect a thermal printer and barcode scanner?',
                a: 'Yes. Standard USB and Bluetooth barcode scanners and thermal receipt printers work out of the box with zero drivers.',
              },
              {
                q: 'How does role-based access work for my staff?',
                a: 'You can create separate logins for Cashiers (POS only), Inventory Managers (Stock only), Delivery staff (Dispatches only), and Admins (Full store management).',
              },
              {
                q: 'Is my data isolated and secure in PostgreSQL?',
                a: 'Yes. Every company has strict tenant-isolated data boundaries and encrypted JWT sessions.',
              },
            ].map((faq, index) => (
              <div key={faq.q} className={`faq-card ${faqOpen === index ? 'open' : ''}`}>
                <button type="button" className="faq-question" onClick={() => toggleFaq(index)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon">{faqOpen === index ? '−' : '+'}</span>
                </button>
                {faqOpen === index ? <p className="faq-answer">{faq.a}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta">
        <div className="container">
          <div className="cta-neu-card">
            <h2 className="cta-title">Upgrade your counter with <span className="text-highlight">BillBhai</span> today</h2>
            <p className="cta-desc">Join thousands of smart retailers across India. Free to use while in beta.</p>
            <div className="cta-actions">
              <Link to="/register-business" className="neu-btn neu-btn--primary neu-neu-btn--lg">
                Create your workspace
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
            <p className="cta-note">Instant setup · No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/logo.png" alt="BillBhai" className="footer-logo-img" />
              <p className="footer-tagline">Billing, inventory, and delivery for Indian retail — one workspace for the whole counter.</p>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#interactive-preview">Live Preview</a>
              <a href="#how-it-works">How It Works</a>
              <Link to="/login">Sign In</Link>
              <Link to="/register-business">Create Workspace</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 BillBhai Systems. Built with precision for Indian Retail.</p>
          </div>
        </div>
      </footer>
    </>
  )
}

export default LandingPage
