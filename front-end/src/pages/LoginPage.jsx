import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { routeByRolePath } from '../services/authService.js'

function LoginPage() {
  const navigate = useNavigate()
  const { user, signIn } = useAuth()

  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [brandText, setBrandText] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    document.title = 'BillBhai - Admin Login'
    document.body.removeAttribute('data-page')
    document.body.setAttribute('data-app-ready', 'true')
  }, [])

  useEffect(() => {
    const text = 'ORDER & BILLING SYSTEM'
    let timer
    let index = 0

    const tick = () => {
      setBrandText(text.slice(0, index))
      if (index <= text.length) {
        index += 1
        timer = window.setTimeout(tick, 55)
      }
    }

    timer = window.setTimeout(tick, 400)
    return () => window.clearTimeout(timer)
  }, [])

  if (user) {
    return <Navigate to={routeByRolePath(user.role)} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!identity.trim() || !password.trim()) {
      setError('Username/email and password are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signIn(identity, password)

      if (!result.ok) {
        setError(result.error)
        return
      }

      navigate(result.redirectPath, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="ambient-glow glow-3" />

      <div className="login-wrapper">
        <div className="login-card" id="loginCard">
          <div className="brand-header">
            <img src="/logo.png" alt="BillBhai Logo" className="brand-logo-img" />
            <p className="brand-subtitle" id="brandSubtitle">{brandText}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
            <div className="input-group" id="usernameGroup">
              <input
                type="text"
                id="username"
                name="username"
                required
                placeholder="Username / Email"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
              />
              <label htmlFor="username">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Username / Email</span>
              </label>
              <div className="input-highlight" />
            </div>

            <div className="input-group" id="passwordGroup">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <label htmlFor="password">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Password</span>
              </label>
              <div className="input-highlight" />

              <button
                type="button"
                className={`toggle-password ${showPassword ? 'showing' : ''}`}
                id="togglePassword"
                aria-label="Show password"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <svg className="eye-open" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg className="eye-closed" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>

            <div className="form-options">
              <label className="custom-checkbox">
                <input type="checkbox" name="remember" id="remember" />
                <span className="checkbox-box">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span className="checkbox-label">Remember me</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            <p className="login-error" id="loginError">
              {error}
            </p>

            <button type="submit" className={`btn-login ${isSubmitting ? 'loading' : ''}`} id="btnLogin" disabled={isSubmitting}>
              <span className="btn-text">{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
              <span className="btn-loader">
                <svg className="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>
              </span>
              <span className="btn-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </button>
          </form>

          <div className="login-footer">
            <p style={{ marginBottom: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
              Don&apos;t have an account?{' '}
              <Link to="/register-business" style={{ color: '#dc3545', fontWeight: 600, textDecoration: 'none' }}>
                Sign Up
              </Link>
            </p>
            <p>&copy; 2026 BillBhai Systems</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginPage
