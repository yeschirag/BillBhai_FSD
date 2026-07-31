import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { routeByRolePath } from '../services/authService.js'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const normalizedRole = String(user?.role || '').trim()
    if (!allowedRoles.includes(normalizedRole)) {
      return <Navigate to={routeByRolePath(normalizedRole)} replace />
    }
  }

  return children
}

export default ProtectedRoute
