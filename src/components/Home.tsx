// Home.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';

// Types
interface Order {
  order_id: number;
  customer_name?: string;
  final_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

interface Product {
  product_id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  max_stock: number;
  cost_price: number;
  price: number;
}

interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  completed_orders: number;
  paid_orders: number;
}

// Home Service
class HomeService {
  private baseURL = 'http://localhost:5000/api';

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Network error';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      } catch {
        errorMessage = errorText || `HTTP error! status: ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  }

  async getRecentOrders(limit: number = 5): Promise<Order[]> {
    const response = await fetch(`${this.baseURL}/orders?limit=${limit}&page=1`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: Order[], pagination: any }>(response);
    return result.data || [];
  }

  async getLowStockProducts(): Promise<Product[]> {
    const response = await fetch(`${this.baseURL}/products/low-stock`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { products: Product[] } }>(response);
    return result.data.products || [];
  }

  async getOrderStats(): Promise<DashboardStats> {
    const response = await fetch(`${this.baseURL}/orders/stats`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { stats: DashboardStats } }>(response);
    return result.data.stats;
  }

  async getInventoryStats(): Promise<{ total_products: number; low_stock: number; total_inventory_value: number }> {
    const response = await fetch(`${this.baseURL}/reports/inventory`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { summary: any } }>(response);
    return result.data.summary || { total_products: 0, low_stock: 0, total_inventory_value: 0 };
  }
}

const homeService = new HomeService();

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color = '#2c3e50' }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color + '20', color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
};

// Recent Orders Component
interface RecentOrdersProps {
  orders: Order[];
  loading: boolean;
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, loading }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': 'Nháp',
      'confirmed': 'Đã xác nhận',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Chờ thanh toán',
      'paid': 'Đã thanh toán',
      'refunded': 'Đã hoàn tiền'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <h3>Đơn hàng gần đây</h3>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Đơn hàng gần đây</h3>
      </div>
      <div className="card-body">
        {orders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">Không có đơn hàng nào</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.order_id} className="order-item">
                <div className="order-info">
                  <div className="order-header">
                    <span className="order-id">#{order.order_id}</span>
                    <span className="order-amount">{formatCurrency(order.final_amount)}</span>
                  </div>
                  <div className="order-customer">{order.customer_name || 'Khách vãng lai'}</div>
                  <div className="order-status">
                    <span className={`status-badge ${order.order_status}`}>
                      {getStatusText(order.order_status)}
                    </span>
                    <span className={`payment-status-badge ${order.payment_status}`}>
                      {getPaymentStatusText(order.payment_status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Low Stock Products Component
interface LowStockProductsProps {
  products: Product[];
  loading: boolean;
}

const LowStockProducts: React.FC<LowStockProductsProps> = ({ products, loading }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <h3>Sản phẩm tồn kho thấp</h3>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Sản phẩm tồn kho thấp</h3>
        {products.length > 0 && (
          <span className="warning-badge">Cảnh báo: {products.length} sản phẩm</span>
        )}
      </div>
      <div className="card-body">
        {products.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">Không có sản phẩm nào tồn kho thấp</p>
          </div>
        ) : (
          <div className="products-list">
            {products.map((product) => (
              <div key={product.product_id} className="product-item">
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-sku">Mã: {product.sku}</div>
                  <div className="product-stock">
                    <span className="stock-warning">Còn {product.stock_quantity} sản phẩm</span>
                  </div>
                </div>
                <div className="product-value">
                  <div className="product-price">{formatCurrency(product.price)}</div>
                  <div className="stock-info">
                    Tối thiểu: {product.min_stock}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Actions Component
const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Tạo đơn hàng',
      icon: '🛒',
      path: '/orders',
      description: 'Tạo đơn hàng mới'
    },
    {
      title: 'Nhập kho',
      icon: '🚚',
      path: '/stockIn',
      description: 'Nhập hàng vào kho'
    },
    {
      title: 'Thêm sản phẩm',
      icon: '📦',
      path: '/products',
      description: 'Thêm sản phẩm mới'
    },
    {
      title: 'Thêm khách hàng',
      icon: '👥',
      path: '/customers',
      description: 'Thêm khách hàng mới'
    },
    {
      title: 'Xem báo cáo',
      icon: '📊',
      path: '/reports',
      description: 'Xem báo cáo doanh thu'
    }
  ];

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Thao tác nhanh</h3>
      </div>
      <div className="card-body">
        <div className="quick-actions-grid">
          {actions.map((action, index) => (
            <button
              key={index}
              className="quick-action-btn"
              onClick={() => navigate(action.path)}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <div className="action-title">{action.title}</div>
                <div className="action-description">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Store Info Component
interface StoreInfoProps {
  orderStats: DashboardStats;
  inventoryStats: {
    total_products: number;
    low_stock: number;
    total_inventory_value: number;
  };
}

const StoreInfo: React.FC<StoreInfoProps> = ({ orderStats, inventoryStats }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Thông tin cửa hàng</h3>
      </div>
      <div className="card-body">
        <div className="store-info">
          <div className="info-item">
            <span className="info-label">Tổng giá trị tồn kho:</span>
            <span className="info-value">{formatCurrency(inventoryStats.total_inventory_value)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Đơn hàng đã thanh toán:</span>
            <span className="info-value">{formatNumber(orderStats.paid_orders)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Tỷ lệ hoàn thành:</span>
            <span className="info-value">
              {orderStats.total_orders > 0 
                ? `${((orderStats.completed_orders / orderStats.total_orders) * 100).toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Sản phẩm cảnh báo:</span>
            <span className="info-value warning-text">{formatNumber(inventoryStats.low_stock)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Home Component
const Home: React.FC = () => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [orderStats, setOrderStats] = useState<DashboardStats>({
    total_orders: 0,
    total_revenue: 0,
    avg_order_value: 0,
    completed_orders: 0,
    paid_orders: 0
  });
  const [inventoryStats, setInventoryStats] = useState({
    total_products: 0,
    low_stock: 0,
    total_inventory_value: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [orders, products, stats, inventory] = await Promise.all([
        homeService.getRecentOrders(5),
        homeService.getLowStockProducts(),
        homeService.getOrderStats(),
        homeService.getInventoryStats()
      ]);

      setRecentOrders(orders);
      setLowStockProducts(products);
      setOrderStats(stats);
      setInventoryStats(inventory);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu dashboard';
      setError(errorMessage);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  if (loading && recentOrders.length === 0 && lowStockProducts.length === 0) {
    return (
      <div className="home-page">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div className="loading-full">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Xin chào, Quản lý!</h1>
          <p>Chào mừng bạn đến với hệ thống quản lý cửa hàng</p>
        </div>
        <button 
          className="refresh-btn"
          onClick={loadDashboardData}
          disabled={loading}
        >
          {loading ? '🔄' : '🔄'} Làm mới
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setError('')}
          >×</button>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="stats-grid">
        <StatCard
          title="Tổng doanh thu"
          value={formatCurrency(orderStats.total_revenue)}
          icon="💰"
          color="#28a745"
        />
        <StatCard
          title="Tổng đơn hàng"
          value={formatNumber(orderStats.total_orders)}
          subtitle={`${orderStats.completed_orders} hoàn thành`}
          icon="📦"
          color="#007bff"
        />
        <StatCard
          title="Giá trị đơn trung bình"
          value={formatCurrency(orderStats.avg_order_value)}
          icon="📊"
          color="#ffc107"
        />
        <StatCard
          title="Sản phẩm tồn kho"
          value={formatNumber(inventoryStats.total_products)}
          subtitle={`${inventoryStats.low_stock} cảnh báo`}
          icon="⚠️"
          color="#dc3545"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        <div className="main-column">
          <RecentOrders orders={recentOrders} loading={loading} />
          <LowStockProducts products={lowStockProducts} loading={loading} />
        </div>
        
        <div className="sidebar-column">
          <QuickActions />
          <StoreInfo orderStats={orderStats} inventoryStats={inventoryStats} />
        </div>
      </div>
    </div>
  );
};

export default Home;