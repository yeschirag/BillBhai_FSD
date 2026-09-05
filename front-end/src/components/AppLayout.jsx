import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '../config/navigation.js'
import { useAuth } from '../context/useAuth.js'
import { useTheme } from '../context/ThemeProvider.jsx'
import { ToastHost } from './toast.jsx'

const ROLE_LABELS = {
  superuser: 'Super User',
  admin: 'Admin',
  cashier: 'Cashier',
  returnhandler: 'Return Handler',
  inventorymanager: 'Inventory Manager',
  deliveryops: 'Delivery Ops',
  customer: 'Customer',
}

// SVG icons matching 44_BillBhai dashboard.html sidebar exactly
const NAV_ICONS = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  orders: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  inventory: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  delivery: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  returns: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  ),
  reports: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  businesses: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  superuser: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
}

const MAIN_NAV_KEYS = ['dashboard', 'orders', 'inventory', 'delivery']
const MANAGEMENT_NAV_KEYS = ['returns', 'reports', 'users', 'businesses', 'superuser']

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const currentRoute = useMemo(() => {
    const route = NAV_ITEMS.find((item) => item.path === location.pathname)
    return route || NAV_ITEMS[0]
  }, [location.pathname])

  // Unread notifications for the active business (dot + count in header)
  const computeUnreadCount = useCallback(() => {
    try {
      const raw = localStorage.getItem('bb_notifications')
      const list = raw ? JSON.parse(raw) : []
      if (!Array.isArray(list)) return 0
      const activeBusinessId = String(localStorage.getItem('activeBusinessId') || '').trim()
      return list.filter((item) => {
        if (!item || item.unread !== true) return false
        const scope = String(item.scopeBusinessId || '').trim()
        return !scope || !activeBusinessId || scope === activeBusinessId
      }).length
    } catch {
      return 0
    }
  }, [])

  useEffect(() => {
    const updateUnread = () => setUnreadCount(computeUnreadCount())
    updateUnread()
    window.addEventListener('storage', updateUnread)
    return () => window.removeEventListener('storage', updateUnread)
  }, [computeUnreadCount, location.pathname])

  // Re-check after the dropdown closes so read receipts clear the dot
  useEffect(() => {
    if (!isNotifOpen) setUnreadCount(computeUnreadCount())
  }, [isNotifOpen, computeUnreadCount])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDropdowns()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setIsSidebarMobileOpen(false)
    closeDropdowns()
  }, [location.pathname])

  // Set body data-page and data-app-ready attributes to activate dashboard.css page-specific styles
  useEffect(() => {
    document.body.setAttribute('data-page', currentRoute.pageKey || 'dashboard')
    document.body.setAttribute('data-app-ready', 'true')
    document.title = `BillBhai - ${currentRoute.label || 'Dashboard'}`
    return () => {
      document.body.removeAttribute('data-page')
    }
  }, [currentRoute])

  const visibleNavItems = useMemo(() => {
    const role = String(user?.role || '').trim()
    return NAV_ITEMS.filter((item) => item.roles.includes(role))
  }, [user])

  const mainItems = useMemo(
    () => visibleNavItems.filter((item) => MAIN_NAV_KEYS.includes(item.pageKey)),
    [visibleNavItems],
  )

  const managementItems = useMemo(
    () => visibleNavItems.filter((item) => MANAGEMENT_NAV_KEYS.includes(item.pageKey)),
    [visibleNavItems],
  )

  const currentLabel = currentRoute.label || 'Workspace'
  const roleLabel = ROLE_LABELS[String(user?.role || '')] || String(user?.role || '')

  const toggleMenu = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarMobileOpen((prev) => !prev)
      return
    }
    setIsSidebarCollapsed((prev) => !prev)
  }

  const closeDropdowns = () => {
    setIsNotifOpen(false)
    setIsUserOpen(false)
  }

  const handleLogout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <aside
        className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarMobileOpen ? 'mobile-open' : ''}`}
        id="sidebar"
      >
        <div className="sidebar-header">
          <img src="/logo.png" alt="BillBhai" className="sidebar-brand-img" />
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Close navigation"
            title="Close sidebar"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setIsSidebarMobileOpen(false)
              } else {
                setIsSidebarCollapsed(true)
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav" id="sidebarNav">
          <div className="nav-section-label">Main</div>
          {mainItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-page={item.pageKey}
            >
              {NAV_ICONS[item.pageKey] || null}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {managementItems.length ? <div className="nav-section-label">Management</div> : null}
          {managementItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-page={item.pageKey}
            >
              {NAV_ICONS[item.pageKey] || null}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="nav-item nav-logout" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div
        className={`sidebar-overlay${isSidebarMobileOpen ? ' show' : ''}`}
        id="sidebarOverlay"
        onClick={() => setIsSidebarMobileOpen(false)}
        aria-hidden="true"
      />

      <main className="main-content" id="mainContent" onClick={closeDropdowns}>
        <header className="top-header">
          <div className="header-left">
            <button
              type="button"
              className="menu-toggle"
              id="menuToggle"
              onClick={toggleMenu}
              aria-label="Toggle navigation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="breadcrumb">
              <span className="bc-app">BillBhai</span>
              <span className="bc-sep">/</span>
              <span className="bc-page" id="bcPage">
                {currentLabel}
              </span>
            </div>
          </div>

          <div className="header-right" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-btn theme-toggle-neu-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            <div className="dropdown-container" id="notifContainer">
              <button
                type="button"
                className="icon-btn notif-neu-btn"
                id="notifBtn"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-haspopup="menu"
                aria-expanded={isNotifOpen}
                onClick={() => {
                  setIsNotifOpen((prev) => !prev)
                  setIsUserOpen(false)
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 ? <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </button>
              <div className={`dropdown-menu notif-menu ${isNotifOpen ? 'show' : ''}`} id="notifDropdown">
                <div className="dropdown-header">
                  <strong>Notifications</strong>
                  <div className="text-sm text-muted">You have new notifications</div>
                </div>
                <NavLink to="/notifications" className="dropdown-item dropdown-item-accent" data-page="notifications" onClick={closeDropdowns}>
                  View all notifications
                </NavLink>
              </div>
            </div>

            <div className="dropdown-container" id="userContainer">
              <button
                type="button"
                className="header-user"
                id="userMenuBtn"
                aria-haspopup="menu"
                aria-expanded={isUserOpen}
                onClick={() => {
                  setIsUserOpen((prev) => !prev)
                  setIsNotifOpen(false)
                }}
              >
                <span className="user-avatar">{String(user?.name || 'U').charAt(0).toUpperCase()}</span>
                <span className="user-info">
                  <span className="user-name">{user?.name || 'User'}</span>
                  <span className="user-role">{roleLabel}</span>
                </span>
              </button>
              <div className={`dropdown-menu ${isUserOpen ? 'show' : ''}`} id="userDropdown">
                <div className="dropdown-header">
                  <strong>{user?.name || 'User'}</strong>
                  <div className="text-sm text-muted">{roleLabel}</div>
                </div>
                <NavLink to="/profile" className="dropdown-item nav-item" data-page="profile" onClick={closeDropdowns}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile &amp; Settings
                </NavLink>
                <div className="dropdown-divider" />
                <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area" id="contentArea">
          <Outlet />
        </div>
      </main>
      <ToastHost />
    </>
  )
}

export default AppLayout
