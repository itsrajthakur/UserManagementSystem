import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './AppLayout.css';

export default function AppLayout() {
  const location = useLocation();
  const { user, loading } = useAuthUser();
  const forcingPasswordReset = Boolean(user?.mustChangePassword);
  const onChangePasswordPage = location.pathname === '/change-password';

  if (!loading && forcingPasswordReset && !onChangePasswordPage) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-shell__body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
