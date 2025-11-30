// components/Layout.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Layout.css';

// ICONS
import { FaUserCircle, FaBox, FaUsers, FaShoppingCart, FaWarehouse, FaSearch, FaChartBar, FaHistory, FaSignOutAlt } from 'react-icons/fa';

export type UserRole = 'manager' | 'staff';

interface User {
  username: string;
  full_name: string;
  role: UserRole;
}

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  user: User;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, user }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      onLogout();
      navigate('/login');
    }
  };

  // Menu items, role 'staff' ko hiện StockIn và Reports
  const menuItems = [
    { name: 'Trang Chủ', path: '/home', icon: <FaBox />, roles: ['manager'] },
    { name: 'Quản lý sản phẩm', path: '/products', icon: <FaBox />, roles: ['manager', 'staff'] },
    { name: 'Quản lý khách hàng', path: '/customers', icon: <FaUsers />, roles: ['manager', 'staff'] },
    { name: 'Quản lý đơn hàng', path: '/orders', icon: <FaShoppingCart />, roles: ['manager', 'staff'] },
    { name: 'Quản lý nhập kho', path: '/stockIn', icon: <FaWarehouse />, roles: ['manager'] },
    { name: 'Tìm kiếm', path: '/serch', icon: <FaSearch />, roles: ['manager', 'staff'] },
    { name: 'Thống kê tồn kho', path: '/reports', icon: <FaChartBar />, roles: ['manager'] },
    { name: 'Lịch sử khách hàng', path: '/history', icon: <FaHistory />, roles: ['manager', 'staff'] },
  ];

  return (
    <div className="app-layout">
      <nav className="sidebar">
        {/* HEADER */}
        <div className="sidebar-header">
          <h2>Hệ thống quản lý<br />cửa hàng</h2>

          <div className="user-info">
            <FaUserCircle className="user-avatar" />
            <div>
              <div className="user-name">
                Xin chào {user.full_name || user.username} !
              </div>
              <div className="user-role">
                {user.role === 'manager' ? '📘 Quản lý' : '👤 Nhân viên'}
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Đăng xuất
          </button>
        </div>

        {/* MENU */}
        <ul className="sidebar-menu">
          {menuItems.map(item => (
            item.roles.includes(user.role) && (
              <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
                <Link to={item.path}>
                  {item.icon} {item.name}
                </Link>
              </li>
            )
          ))}
        </ul>
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
