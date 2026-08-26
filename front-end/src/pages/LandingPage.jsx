import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function LandingPage() {
  const [isNavScrolled, setIsNavScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      {/* Navigation */}
      <nav className={`navbar${isNavScrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="container nav-container">
          <a href="#" className="nav-brand">
            <img src="/logo.png" alt="BillBhai" className="nav-logo-img" />
          </a>
          <div className={`nav-links${isMobileMenuOpen ? ' open' : ''}`} id="navLinks">
            <a href="#features" className="nav-link" onClick={closeMobileMenu}>Features</a>
            <a href="#how-it-works" className="nav-link" onClick={closeMobileMenu}>How It Works</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost" id="navSignInBtn">Sign In</Link>
            <Link to="/register-business" className="btn btn-primary" id="navPrimaryBtn">Create Workspace</Link>
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
                <span>Free to use while in beta</span>
              </div>
              <h1 className="hero-title">
                <span className="hero-line">Run your entire shop</span>
                <span className="hero-line hero-accent-line">from one screen</span>
              </h1>
              <p className="hero-subtitle">
                BillBhai is a billing and inventory workspace for Indian retail — GST-ready
                invoices at the counter, stock that updates with every bill, and a login for
                every staff member from cashier to delivery.
              </p>
              <div className="hero-pills" aria-label="Core product capabilities">
                <span className="hero-pill">GST invoices</span>
                <span className="hero-pill">Live inventory</span>
                <span className="hero-pill">Staff roles</span>
                <span className="hero-pill">Delivery tracking</span>
              </div>
              <div className="hero-cta">
                <Link to="/register-business" className="btn btn-primary btn-lg" id="heroPrimaryBtn">
                  Create your workspace
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <a href="#how-it-works" className="btn btn-outline btn-lg">See How It Works</a>
              </div>
            </div>
            <div className="hero-visual">
              <div className="dashboard-preview">
                <div className="preview-topbar">
                  <div className="preview-dots">
                    <span /><span /><span />
                  </div>
                  <span className="preview-url">billbhai.vercel.app/dashboard</span>
                </div>
                <div className="preview-body">
                  <div className="preview-sidebar">
                    <div className="ps-item active">Dashboard</div>
                    <div className="ps-item">POS Terminal</div>
                    <div className="ps-item">Orders</div>
                    <div className="ps-item">Inventory</div>
                    <div className="ps-item">Reports</div>
                  </div>
                  <div className="preview-content">
                    <div className="pc-stat-row">
                      <div className="pc-stat">
                        <div className="pc-stat-icon green">₹</div>
                        <div className="pc-stat-text">
                          <span className="pc-label">Revenue</span>
                          <span className="pc-val">₹58,680</span>
                        </div>
                      </div>
                      <div className="pc-stat">
                        <div className="pc-stat-icon blue">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        </div>
                        <div className="pc-stat-text">
                          <span className="pc-label">Orders</span>
                          <span className="pc-val">124</span>
                        </div>
                      </div>
                      <div className="pc-stat">
                        <div className="pc-stat-icon amber">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div className="pc-stat-text">
                          <span className="pc-label">Low stock</span>
                          <span className="pc-val">7</span>
                        </div>
                      </div>
                    </div>
                    <div className="pc-chart">
                      <svg viewBox="0 0 300 80" className="chart-line" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(220,53,69,0.3)" />
                            <stop offset="100%" stopColor="rgba(220,53,69,0)" />
                          </linearGradient>
                        </defs>
                        <path className="chart-stroke" d="M0,60 Q30,55 60,45 T120,30 T180,35 T240,15 T300,20" fill="none" stroke="#dc3545" strokeWidth="2" />
                        <path className="chart-fill" d="M0,60 Q30,55 60,45 T120,30 T180,35 T240,15 T300,20 L300,80 L0,80 Z" fill="url(#chartGrad)" />
                      </svg>
                    </div>
                    <div className="pc-table">
                      <div className="pc-row">
                        <span className="pc-order">ORD-1042</span>
                        <span className="pc-customer">Meera Shah</span>
                        <span className="pc-amount">₹1,240</span>
                        <span className="pc-badge green">Paid</span>
                      </div>
                      <div className="pc-row">
                        <span className="pc-order">ORD-1041</span>
                        <span className="pc-customer">Arjun Rao</span>
                        <span className="pc-amount">₹860</span>
                        <span className="pc-badge blue">Packed</span>
                      </div>
                      <div className="pc-row">
                        <span className="pc-order">ORD-1040</span>
                        <span className="pc-customer">S. Gupta &amp; Sons</span>
                        <span className="pc-amount">₹2,410</span>
                        <span className="pc-badge amber">In transit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Built around how a counter actually works</h2>
            <p className="section-desc">Billing, stock, staff, and delivery — each piece wired to the others, so nothing falls out of sync.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h3>GST Invoicing</h3>
              <p>Ring up an order at the POS terminal and hand over a GST-compliant bill — tax, discounts, and totals calculated for you.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <h3>Live Inventory</h3>
              <p>Stock decrements with every bill and returns restore it. Low-stock counts surface on the dashboard before you run out.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <h3>Delivery Tracking</h3>
              <p>Hand orders to delivery staff and follow each one from packing to doorstep, with status visible to the whole team.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>Role-Based Access</h3>
              <p>Cashiers bill, inventory managers stock, admins oversee. Every staff member gets a login scoped to their job.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3>Reports</h3>
              <p>Revenue, order volume, and category breakdowns for the day, week, or month — no spreadsheet export needed.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </div>
              <h3>Returns &amp; Refunds</h3>
              <p>Process returns without breaking your books — stock is restored, refunds are logged, and the order history stays intact.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">From sign-up to first bill</h2>
            <p className="section-desc">No setup fees, no training sessions. If your staff can use a phone, they can use BillBhai.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3>Register your business</h3>
                <p>Create a workspace with your shop&apos;s name and GST details. Takes about a minute.</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3>Add products and staff</h3>
                <p>Stock your catalog with prices and opening quantities, then create logins for your cashier, inventory, and delivery team.</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3>Start billing</h3>
                <p>Open the POS terminal and ring up your first order. Inventory, reports, and delivery status stay in sync automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta">
          <div className="container">
          <div className="cta-card">
            <div className="cta-glow" />
            <h2 className="cta-title">Ready to run your shop on <span className="text-highlight">BillBhai</span>?</h2>
            <p className="cta-desc">Create a workspace, add your products, and bill your first customer today.</p>
            <div className="cta-actions">
              <Link to="/register-business" className="btn btn-primary btn-lg">
                Create your workspace
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
            <p className="cta-note">Free while in beta · No credit card required</p>
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
              <a href="#how-it-works">How It Works</a>
              <Link to="/login">Sign In</Link>
              <Link to="/register-business">Create Workspace</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 BillBhai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}

export default LandingPage
