// App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerManagement from './components/customer';
import ProductManagement from './components/product';
import OrderManagement from './components/oder';
import StockInManagement from '../src/components/stockIn';
import ReportManagement from '../src/components/Reports';

import Dashboard from '../src/components/Home';
import Login from './components/Login';
import Layout from './Layout/Layout';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hàm kiểm tra đăng nhập
  const checkAuth = () => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    console.log('Logging out...'); // Debug
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  // Nếu chưa đăng nhập, hiển thị trang login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Nếu đã đăng nhập, hiển thị ứng dụng chính
  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/customers" replace />} />
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/stockIn" element={<StockInManagement />} />
          <Route path="/home" element={<Dashboard />} />
          <Route path="/reports" element={<ReportManagement />} />
  
          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;