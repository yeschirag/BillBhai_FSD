import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/useAuth.js'
import {
  ADMIN_AND_ABOVE_ROLES,
  ALL_OPERATION_ROLES,
  routeByRolePath,
} from './services/authService.js'
import DashboardPage from './pages/DashboardPage.jsx'
import BusinessesPage from './pages/BusinessesPage.jsx'
import CashierPage from './pages/CashierPage.jsx'
import DeliveryPage from './pages/DeliveryPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterBusinessPage from './pages/RegisterBusinessPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ReturnsPage from './pages/ReturnsPage.jsx'
import SuperuserPage from './pages/SuperuserPage.jsx'
import SubscriptionPlanPage from './pages/SubscriptionPlanPage.jsx'
import UsersPage from './pages/UsersPage.jsx'

function AppRoot() {
  const { user } = useAuth()
  // If already logged in, go to dashboard; otherwise show landing page
  if (user) {
    return <Navigate to={routeByRolePath(user.role)} replace />
  }
  return <LandingPage />
}

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<AppRoot />} />
      <Route
        path="/login"
        element={user ? <Navigate to={routeByRolePath(user.role)} replace /> : <LoginPage />}
      />
      <Route
        path="/register-business"
        element={user ? <Navigate to={routeByRolePath(user.role)} replace /> : <RegisterBusinessPage />}
      />

      {/* Cashier — standalone (no sidebar layout) */}
      <Route
        path="/cashier"
        element={(
          <ProtectedRoute allowedRoles={['superuser', 'admin', 'cashier', 'customer']}>
            <CashierPage />
          </ProtectedRoute>
        )}
      />

      {/* Protected app shell with sidebar */}
      <Route
        element={(
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        )}
      >
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={ADMIN_AND_ABOVE_ROLES}>
              <DashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders"
          element={(
            <ProtectedRoute allowedRoles={ALL_OPERATION_ROLES}>
              <OrdersPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/inventory"
          element={(
            <ProtectedRoute allowedRoles={ALL_OPERATION_ROLES}>
              <InventoryPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/delivery"
          element={(
            <ProtectedRoute allowedRoles={ALL_OPERATION_ROLES}>
              <DeliveryPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/returns"
          element={(
            <ProtectedRoute allowedRoles={ALL_OPERATION_ROLES}>
              <ReturnsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/reports"
          element={(
            <ProtectedRoute allowedRoles={ADMIN_AND_ABOVE_ROLES}>
              <ReportsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/users"
          element={(
            <ProtectedRoute allowedRoles={ADMIN_AND_ABOVE_ROLES}>
              <UsersPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/businesses"
          element={(
            <ProtectedRoute allowedRoles={['superuser']}>
              <BusinessesPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/subscription-plan"
          element={(
            <ProtectedRoute allowedRoles={ADMIN_AND_ABOVE_ROLES}>
              <SubscriptionPlanPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute allowedRoles={ALL_OPERATION_ROLES}>
              <NotificationsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute allowedRoles={ALL_OPERATION_ROLES}>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/superuser"
          element={(
            <ProtectedRoute allowedRoles={['superuser']}>
              <SuperuserPage />
            </ProtectedRoute>
          )}
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
