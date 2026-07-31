import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function LandingPage() {
  const [isNavScrolled, setIsNavScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const statsRef = useRef(null)
  const statsAnimated = useRef(false)

  useEffect(() => {
    document.title = 'BillBhai - Smart Billing and Inventory for Modern Businesses'
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

  // Animate stat counters when in view
  useEffect(() => {
    const el = statsRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !statsAnimated.current) {
            statsAnimated.current = true
            el.querySelectorAll('.stat-number[data-target]').forEach((counter) => {
              const target = parseInt(counter.getAttribute('data-target'), 10)
              const duration = 1800
              const step = Math.ceil(target / (duration / 16))
              let current = 0
              const timer = setInterval(() => {
                current = Math.min(current + step, target)
                if (target >= 1000000) {
                  counter.textContent = (current / 1000000).toFixed(1) + 'M'
                } else if (target >= 1000) {
                  counter.textContent = (current / 1000).toFixed(0) + 'K'
                } else {
                  counter.textContent = current
                }
                if (current >= target) clearInterval(timer)
              }, 16)
            })
          }
        })
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Ambient Background */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="ambient-glow glow-3" />
      <div className="grid-pattern" />

      {/* Navigation */}
      <nav className={`navbar${isNavScrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="container nav-container">
          <a href="#" className="nav-brand">
            <img src="/logo.png" alt="BillBhai" className="nav-logo-img" />
          </a>
          <div className={`nav-links${isMobileMenuOpen ? ' open' : ''}`} id="navLinks">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#stats" className="nav-link">Impact</a>
            <a href="#testimonials" className="nav-link">Testimonials</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost" id="navSignInBtn">Sign In</Link>
            <a href="#cta" className="btn btn-primary" id="navPrimaryBtn">Get Started Free</a>
          </div>
          <button
            className="mobile-toggle"
            id="mobileToggle"
            aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <span className="badge-dot" />
            <span>Trusted by 500+ businesses across India</span>
          </div>
          <h1 className="hero-title">
            <span className="hero-line">Billing Made</span>
            <span className="hero-line hero-accent">Effortless.</span>
          </h1>
          <p className="hero-subtitle">
            BillBhai is the all-in-one platform for invoicing, inventory tracking,
            and order management — designed for speed, built for Indian businesses.
          </p>
          <div className="hero-cta">
            <Link to="/register-business" className="btn btn-primary btn-lg" id="heroPrimaryBtn">
              Start Free Trial
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <a href="#how-it-works" className="btn btn-outline btn-lg">See How It Works</a>
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
                  <div className="ps-item active" />
                  <div className="ps-item" />
                  <div className="ps-item" />
                  <div className="ps-item" />
                  <div className="ps-item" />
                </div>
                <div className="preview-content">
                  <div className="pc-stat-row">
                    <div className="pc-stat">
                      <div className="pc-stat-icon green" />
                      <div className="pc-stat-text">
                        <span className="pc-label">Revenue</span>
                        <span className="pc-val">₹58,680</span>
                      </div>
                    </div>
                    <div className="pc-stat">
                      <div className="pc-stat-icon blue" />
                      <div className="pc-stat-text">
                        <span className="pc-label">Orders</span>
                        <span className="pc-val">124</span>
                      </div>
                    </div>
                    <div className="pc-stat">
                      <div className="pc-stat-icon amber" />
                      <div className="pc-stat-text">
                        <span className="pc-label">Accuracy</span>
                        <span className="pc-val">98.2%</span>
                      </div>
                    </div>
                  </div>
                  <div className="pc-chart">
                    <svg viewBox="0 0 300 80" className="chart-line">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(220,53,69,0.3)" />
                          <stop offset="100%" stopColor="rgba(220,53,69,0)" />
                        </linearGradient>
                      </defs>
                      <path d="M0,60 Q30,55 60,45 T120,30 T180,35 T240,15 T300,20" fill="none" stroke="#dc3545" strokeWidth="2" />
                      <path d="M0,60 Q30,55 60,45 T120,30 T180,35 T240,15 T300,20 L300,80 L0,80 Z" fill="url(#chartGrad)" />
                    </svg>
                  </div>
                  <div className="pc-table">
                    <div className="pc-row"><span /><span /><span className="pc-badge green" /></div>
                    <div className="pc-row"><span /><span /><span className="pc-badge blue" /></div>
                    <div className="pc-row"><span /><span /><span className="pc-badge amber" /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="float-card float-card-1">
              <div className="fc-icon green">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <div className="fc-text">
                <span className="fc-label">Revenue Today</span>
                <span className="fc-value">₹12,450</span>
              </div>
            </div>
            <div className="float-card float-card-2">
              <div className="fc-icon blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="fc-text">
                <span className="fc-label">Order Completed</span>
                <span className="fc-value">#4821</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Everything your business needs</h2>
            <p className="section-desc">From lightning-fast invoicing to granular inventory control — BillBhai packs enterprise power into a beautifully simple interface.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h3>Instant Invoicing</h3>
              <p>Generate professional GST-compliant invoices in seconds. Auto-calculate taxes, discounts, and totals with zero errors.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <h3>Real-Time Inventory</h3>
              <p>Track stock levels across locations with real-time updates. Get low-stock alerts before you run out, never miss a sale.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <h3>Delivery Tracking</h3>
              <p>Monitor deliveries from dispatch to doorstep. Real-time status updates keep you and your customers in the loop.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3>Smart Analytics</h3>
              <p>Understand your business with interactive charts, revenue trends, and category breakdowns — all updated in real time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>Multi-User Access</h3>
              <p>Add team members with role-based permissions. Admins, managers, and staff each see exactly what they need.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </div>
              <h3>Returns &amp; Refunds</h3>
              <p>Handle product returns and issue refunds seamlessly. Automatic stock updates and customer communication built in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats" id="stats" ref={statsRef}>
        <div className="container">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-number" data-target="500">0</span>
              <span className="stat-suffix">+</span>
              <span className="stat-label">Active Businesses</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number" data-target="1200000">0</span>
              <span className="stat-suffix" />
              <span className="stat-label">Invoices Generated</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number" data-target="99">0</span>
              <span className="stat-suffix">.9%</span>
              <span className="stat-label">Uptime Guarantee</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number" data-target="4">0</span>
              <span className="stat-suffix">sec</span>
              <span className="stat-label">Avg. Invoice Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">How It Works</span>
            <h2 className="section-title">Up and running in minutes</h2>
            <p className="section-desc">No complex setup. No training needed. Just sign up and start billing.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3>Create Your Account</h3>
                <p>Sign up in 30 seconds with just your email. No credit card required to start your free trial.</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3>Add Your Products</h3>
                <p>Import your catalog via CSV or add items manually. Set prices, categories, and stock levels in one go.</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3>Start Billing</h3>
                <p>Create invoices, track orders, and manage inventory — all from a single beautiful dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials" id="testimonials">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Testimonials</span>
            <h2 className="section-title">Loved by businesses</h2>
            <p className="section-desc">See what our users have to say about BillBhai.</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&quot;BillBhai transformed how we handle billing. What used to take 15 minutes per invoice now takes seconds. The inventory tracking alone saved us lakhs.&quot;</p>
              <div className="testimonial-author">
                <div className="author-avatar">RS</div>
                <div className="author-info">
                  <span className="author-name">Rahul Sharma</span>
                  <span className="author-role">Owner, Sharma Electronics</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card featured">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&quot;We switched from paper billing to BillBhai and saw a 40% increase in order accuracy. The analytics dashboard gives me insights I never had before.&quot;</p>
              <div className="testimonial-author">
                <div className="author-avatar">PP</div>
                <div className="author-info">
                  <span className="author-name">Priya Patel</span>
                  <span className="author-role">Manager, FreshMart Groceries</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&quot;The delivery tracking feature is a game-changer. Our customers love the real-time updates, and returns handling has become completely painless.&quot;</p>
              <div className="testimonial-author">
                <div className="author-avatar">AK</div>
                <div className="author-info">
                  <span className="author-name">Amit Kumar</span>
                  <span className="author-role">Founder, QuickDrop Logistics</span>
                </div>
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
            <h2 className="cta-title">Ready to simplify your business?</h2>
            <p className="cta-desc">Join 500+ businesses already using BillBhai. Start your free trial today — no credit card required.</p>
            <div className="cta-actions">
              <Link to="/register-business" className="btn btn-primary btn-lg">
                Get Started Free
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
            <p className="cta-note">Free 14-day trial · No credit card · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/logo.png" alt="BillBhai" className="footer-logo-img" />
              <p className="footer-tagline">Smart billing &amp; inventory management for modern Indian businesses.</p>
            </div>
            <div className="footer-col">
              <div className="footer-col">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#">Pricing</a>
                <a href="#">Integrations</a>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <a href="#">About Us</a>
                <a href="#">Careers</a>
                <a href="#">Blog</a>
                <a href="#">Contact</a>
              </div>
              <div className="footer-col">
                <h4>Support</h4>
                <a href="#">Help Center</a>
                <a href="#">Documentation</a>
                <a href="#">API Reference</a>
                <a href="#">Status</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 BillBhai Systems. All rights reserved.</p>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default LandingPage
