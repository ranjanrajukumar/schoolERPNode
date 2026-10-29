import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword && pathname !== '/change-password')
    return <Navigate to="/change-password" replace />;
  return <Outlet />;
}
