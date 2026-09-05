import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiProvider } from '../api/index.js'

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
    businessType: 'Retail',
    address: '',
    city: '',
    state: '',
    pincode: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    document.title = 'BillBhai — Register Your Business'
    document.body.classList.remove('landing-page')
    document.body.classList.add('no-sidebar')
    document.body.removeAttribute('data-page')
    document.body.setAttribute('data-app-ready', 'true')
    return () => {
      document.body.classList.remove('no-sidebar')
    }
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
    try {
      const payload = {
        name: form.businessName.trim(),
        adminName: form.ownerName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        type: form.businessType || 'Retail',
        gstin: form.gstin.trim() || undefined,
        address: form.address.trim() || undefined,
      }

      const res = await apiProvider.register(payload)
      if (res && res.ok === false) {
        setError(res.error || 'Registration failed. Please verify your details.')
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="register-wrapper">
        <div className="register-neu-card">
          <div className="auth-success">
            <div className="success-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2>Registration Received</h2>
            <p className="text-muted">
              Thanks — we have your details for {form.businessName.trim() || 'your business'}.
            </p>
            <Link to="/login" className="neu-btn neu-btn--primary">Go to Sign In</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="register-wrapper wide">
        <div className="register-neu-card" id="registerCard">
          <div className="brand-header">
            <img src="/logo.png" alt="BillBhai Logo" className="brand-logo-img" />
          </div>

          <h2 className="form-section-title">Business Registration</h2>
          <p className="form-section-desc">Set up your shop on BillBhai in under a minute</p>

          <form id="registerForm" className="register-form" autoComplete="off" onSubmit={handleSubmit}>
            {/* Business & Owner Info */}
            <div className="form-row">
              <div className="input-group" id="businessNameGroup">
                <label htmlFor="businessName">Business Name</label>
                <input type="text" id="businessName" name="businessName" required value={form.businessName} onChange={handleChange} />
              </div>
              <div className="input-group" id="ownerNameGroup">
                <label htmlFor="ownerName">Owner Full Name</label>
                <input type="text" id="ownerName" name="ownerName" required value={form.ownerName} onChange={handleChange} />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="form-row">
              <div className="input-group" id="emailGroup">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" name="email" required autoComplete="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="input-group" id="phoneGroup">
                <label htmlFor="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" required autoComplete="tel" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            {/* GSTIN & Business Type */}
            <div className="form-row">
              <div className="input-group" id="gstinGroup">
                <label htmlFor="gstin">GSTIN (Optional)</label>
                <input type="text" id="gstin" name="gstin" value={form.gstin} onChange={handleChange} />
              </div>
              <div className="input-group" id="businessTypeGroup">
                <label htmlFor="businessType">Business Type</label>
                <select id="businessType" name="businessType" className="form-control" value={form.businessType} onChange={handleChange}>
                  <option value="" disabled>Select a type</option>
                  <option value="retail">Retail Store</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="restaurant">Restaurant / Food</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing &amp; Apparel</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="input-group" id="addressGroup">
              <label htmlFor="address">Street Address</label>
              <input type="text" id="address" name="address" autoComplete="street-address" value={form.address} onChange={handleChange} />
            </div>

            <div className="form-row cols-3">
              <div className="input-group">
                <label htmlFor="city">City</label>
                <input type="text" id="city" name="city" value={form.city} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label htmlFor="state">State</label>
                <input type="text" id="state" name="state" value={form.state} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label htmlFor="pincode">Pincode</label>
                <input type="text" id="pincode" name="pincode" inputMode="numeric" maxLength="6" value={form.pincode} onChange={handleChange} />
              </div>
            </div>

            {/* Password */}
            <div className="form-row">
              <div className="input-group" id="passwordGroup">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" required minLength="6" autoComplete="new-password" value={form.password} onChange={handleChange} />
              </div>
              <div className="input-group" id="confirmPasswordGroup">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required minLength="6" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} />
              </div>
            </div>

            {error ? (
              <p className="login-error" role="alert">{error}</p>
            ) : null}

            <button type="submit" className={`btn-login ${isSubmitting ? 'loading' : ''}`} id="btnRegister" disabled={isSubmitting}>
              <span className="neu-btn-text">{isSubmitting ? 'Creating Account…' : 'Create Business Account'}</span>
              <span className="neu-btn-loader">
                <svg className="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>
              </span>
            </button>
          </form>

          <div className="login-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="accent-link">
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
