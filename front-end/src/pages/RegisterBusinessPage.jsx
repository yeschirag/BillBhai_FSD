import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function RegisterBusinessPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    gstin: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    document.title = 'BillBhai — Register Your Business'
    document.body.removeAttribute('data-page')
    document.body.removeAttribute('data-app-ready')
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.businessName.trim() || !form.ownerName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    setSubmitted(true)
    setIsSubmitting(false)
  }

  if (submitted) {
    return (
      <>
        <div className="ambient-glow glow-1" />
        <div className="ambient-glow glow-2" />
        <div className="ambient-glow glow-3" />
        <div className="register-wrapper">
          <div className="register-card" style={{ textAlign: 'center', padding: '48px 40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Your business has been registered. You can sign in now.
            </p>
            <Link to="/login" className="btn btn-primary">Sign In Now</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="ambient-glow glow-3" />

      <div className="register-wrapper wide">
        <div className="register-card" id="registerCard">
          <div className="brand-header">
            <img src="/logo.png" alt="BillBhai Logo" className="brand-logo-img" />
          </div>

          <h2 className="form-section-title">Business Registration</h2>
          <p className="form-section-desc">Set up your shop on BillBhai in under a minute</p>

          <form id="registerForm" className="register-form" autoComplete="off" onSubmit={handleSubmit}>
            {/* Business & Owner Info */}
            <div className="form-row">
              <div className="input-group" id="businessNameGroup">
                <input type="text" id="businessName" name="businessName" required placeholder="Business Name" value={form.businessName} onChange={handleChange} />
                <label htmlFor="businessName">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span>Business Name</span>
                </label>
                <div className="input-highlight" />
              </div>
              <div className="input-group" id="ownerNameGroup">
                <input type="text" id="ownerName" name="ownerName" required placeholder="Owner Full Name" value={form.ownerName} onChange={handleChange} />
                <label htmlFor="ownerName">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Owner Full Name</span>
                </label>
                <div className="input-highlight" />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="form-row">
              <div className="input-group" id="emailGroup">
                <input type="email" id="email" name="email" required placeholder="Email Address" value={form.email} onChange={handleChange} />
                <label htmlFor="email">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span>Email Address</span>
                </label>
                <div className="input-highlight" />
              </div>
              <div className="input-group" id="phoneGroup">
                <input type="tel" id="phone" name="phone" required placeholder="Phone Number" value={form.phone} onChange={handleChange} />
                <label htmlFor="phone">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>Phone Number</span>
                </label>
                <div className="input-highlight" />
              </div>
            </div>

            {/* GSTIN & Business Type */}
            <div className="form-row">
              <div className="input-group" id="gstinGroup">
                <input type="text" id="gstin" name="gstin" placeholder="GSTIN (Optional)" value={form.gstin} onChange={handleChange} />
                <label htmlFor="gstin">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <span>GSTIN</span>
                </label>
                <div className="input-highlight" />
              </div>
              <div className="input-group" id="businessTypeGroup">
                <select id="businessType" name="businessType" value={form.businessType} onChange={handleChange} style={{ background: 'transparent', color: 'inherit', border: 'none', width: '100%', outline: 'none', fontSize: '0.95rem', paddingTop: '8px' }}>
                  <option value="" disabled>Business Type</option>
                  <option value="retail">Retail Store</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="restaurant">Restaurant / Food</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing & Apparel</option>
                  <option value="other">Other</option>
                </select>
                <label htmlFor="businessType">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Business Type</span>
                </label>
                <div className="input-highlight" />
              </div>
            </div>

            {/* Address */}
            <div className="input-group" id="addressGroup">
              <input type="text" id="address" name="address" placeholder="Street Address" value={form.address} onChange={handleChange} />
              <label htmlFor="address">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Street Address</span>
              </label>
              <div className="input-highlight" />
            </div>

            <div className="form-row">
              <div className="input-group">
                <input type="text" id="city" name="city" placeholder="City" value={form.city} onChange={handleChange} />
                <label htmlFor="city"><span>City</span></label>
                <div className="input-highlight" />
              </div>
              <div className="input-group">
                <input type="text" id="state" name="state" placeholder="State" value={form.state} onChange={handleChange} />
                <label htmlFor="state"><span>State</span></label>
                <div className="input-highlight" />
              </div>
              <div className="input-group">
                <input type="text" id="pincode" name="pincode" placeholder="Pincode" value={form.pincode} onChange={handleChange} />
                <label htmlFor="pincode"><span>Pincode</span></label>
                <div className="input-highlight" />
              </div>
            </div>

            {/* Password */}
            <div className="form-row">
              <div className="input-group" id="passwordGroup">
                <input type="password" id="password" name="password" required placeholder="Password" value={form.password} onChange={handleChange} />
                <label htmlFor="password">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Password</span>
                </label>
                <div className="input-highlight" />
              </div>
              <div className="input-group" id="confirmPasswordGroup">
                <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} />
                <label htmlFor="confirmPassword">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Confirm Password</span>
                </label>
                <div className="input-highlight" />
              </div>
            </div>

            {error && <p className="login-error" style={{ textAlign: 'center', marginBottom: '12px' }}>{error}</p>}

            <button type="submit" className={`btn-login ${isSubmitting ? 'loading' : ''}`} id="btnRegister" style={{ width: '100%' }}>
              <span className="btn-text">{isSubmitting ? 'Creating Account...' : 'Create Business Account'}</span>
              <span className="btn-loader">
                <svg className="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>
              </span>
              <span className="btn-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </button>
          </form>

          <div className="login-footer" style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#dc3545', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default RegisterBusinessPage
