import React, { useState } from 'react';
import axios from 'axios';
import './Login.css'
import { FaStore } from 'react-icons/fa';
import '../App.css';
import type { User } from '../App';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
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

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => setter(e.target.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(API_URL, { username, password });
      const { token, user } = response.data.data;

      if (!token || !user) {
        setError('Đăng nhập thất bại, không có token hoặc user');
        setLoading(false);
        return;
      }

      onLogin(token, user);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi server khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-container">
      <div className="header-container">
        <Logo />
        <h3>Hệ thống quản lý cửa hàng</h3>
        <p>Đăng nhập để tiếp tục</p>
      </div>

      {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

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
      
      <button type="submit" className="login-button" disabled={loading}>
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
};

export default Login;
