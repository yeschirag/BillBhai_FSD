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
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    document.title = 'BillBhai - Sign In'
    document.body.classList.remove('landing-page')
    document.body.removeAttribute('data-page')
    document.body.classList.add('no-sidebar')
    document.body.setAttribute('data-app-ready', 'true')
    return () => {
      document.body.classList.remove('no-sidebar')
    }
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
      <div className="login-wrapper">
        <div className="login-card" id="loginCard">
            <div className="brand-header">
              <img src="/logo.png" alt="BillBhai Logo" className="brand-logo-img" />
              <p className="brand-subtitle" id="brandSubtitle">ORDER &amp; BILLING SYSTEM</p>
              <p className="login-desc login-lead">
                Sign in to manage orders, inventory, and billing in one workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
              <div className="input-group" id="usernameGroup">
                <label htmlFor="username">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Username / Email
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  autoComplete="username"
                  value={identity}
                  onChange={(event) => setIdentity(event.target.value)}
                />
              </div>

              <div className="input-group" id="passwordGroup">
                <label htmlFor="password">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  className={`toggle-password ${showPassword ? 'showing' : ''}`}
                  id="togglePassword"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <svg className="eye-open" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg className="eye-closed" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>

              <div className="form-options">
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => setError('Password reset is not enabled yet. Please ask an admin to update your account.')}
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <p className="login-error" id="loginError" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className={`btn-login ${isSubmitting ? 'loading' : ''}`} id="btnLogin" disabled={isSubmitting}>
                <span className="btn-text">{isSubmitting ? 'Signing In…' : 'Sign In'}</span>
                <span className="btn-loader">
                  <svg className="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle></svg>
                </span>
              </button>
            </form>

            <div className="login-footer">
              <p style={{ marginBottom: '10px' }}>
                Don&apos;t have an account?{' '}
                <Link to="/register-business" className="accent-link">
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
