import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './AppLayout.css';

export default function AppLayout() {
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
