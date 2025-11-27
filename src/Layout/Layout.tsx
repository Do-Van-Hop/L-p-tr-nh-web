// components/Layout.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      onLogout();
      // Chuyển hướng về login page (mặc dù App component sẽ tự động chuyển)
      navigate('/login');
    }
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>🛍️ Store Management</h2>
        </div>
        <ul className="sidebar-menu">
          
          <li className={location.pathname === '/home' ? 'active' : ''}>
            <Link to="/home">
              🏠 Trang Chủ
            </Link>
          </li>
          <li className={location.pathname === '/customers' ? 'active' : ''}>
            <Link to="/customers">
              👥 Quản lý Khách hàng
            </Link>
          </li>
          <li className={location.pathname === '/products' ? 'active' : ''}>
            <Link to="/products">
              📦 Quản lý Sản phẩm
            </Link>
          </li>
          <li className={location.pathname === '/orders' ? 'active' : ''}>
            <Link to="/orders">
              🛒 Quản lý Đơn hàng
            </Link>
          </li>
          <li className={location.pathname === '/stockIn' ? 'active' : ''}>
            <Link to="/stockIn">
              🚚 Nhập Kho
            </Link>
          </li>
          <li className={location.pathname === '/reports' ? 'active' : ''}>
            <Link to="/reports">
              📊 Báo cáo và Thống kê
            </Link>
          </li>
       
      
          <li className="logout-item">
            <button 
              onClick={handleLogout}
              className="logout-btn"
            >
              🚪 Đăng xuất
            </button>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;