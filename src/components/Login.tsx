// components/Login.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { FaStore } from 'react-icons/fa';
import './Login.css';

interface LoginProps {
  onLogin: (token: string) => void;
}

const API_URL = 'http://localhost:5000/api/auth/login';

const Logo = () => (
  <div className="logo-container">
    <FaStore style={{ width: '32px', height: '32px', color: 'white' }} />
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(API_URL, {
        username,
        password
      });

      const { token, user } = response.data.data;
      
      // Gọi callback từ App component
      onLogin(token);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Lỗi kết nối hoặc lỗi không xác định.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="card-container">
      <div className="header-container">
        <Logo />
        <h3 style={{fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0'}}>Hệ thống quản lý cửa hàng</h3>
        <p style={{color: '#6b7280', fontSize: '14px', margin: '0'}}>Đăng nhập để tiếp tục</p>
      </div>

      {error && <div style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{error}</div>}

      <label className="label">Tên đăng nhập</label>
      <input 
        type="text" 
        placeholder="Nhập tên đăng nhập" 
        className="input-field"
        value={username} 
        onChange={handleInputChange(setUsername)}
      />
      
      <label className="label">Mật khẩu</label>
      <input 
        type="password" 
        placeholder="Nhập mật khẩu" 
        className="input-field"
        value={password} 
        onChange={handleInputChange(setPassword)}
      />
      
      <button 
        type="submit" 
        className="login-button"
        disabled={loading}
      >
        {loading ? 'Đang Đăng nhập...' : 'Đăng nhập'}
      </button>

    
    </form>
  );
}

export default Login;