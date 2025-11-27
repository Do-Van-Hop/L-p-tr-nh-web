// Reports.tsx
import React, { useState, useEffect } from 'react';
import './reports.css';

// Types
interface SalesReport {
  period: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  paid_orders: number;
  completed_orders: number;
}

interface TopProduct {
  product_id: number;
  name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
  total_orders: number;
}

interface InventoryReport {
  product_id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  max_stock: number;
  cost_price: number;
  price: number;
  category_name: string;
  supplier_name: string;
  stock_status: 'low' | 'normal' | 'high';
}

interface InventorySummary {
  total_products: number;
  low_stock: number;
  normal_stock: number;
  high_stock: number;
  total_inventory_value: number;
}

interface OrderStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  completed_orders: number;
  paid_orders: number;
}

interface StockInStats {
  total_orders: number;
  total_value: number;
  avg_order_value: number;
  confirmed_orders: number;
  draft_orders: number;
}

// Reports Service
class ReportsService {
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

  async getSalesReport(period: string = 'monthly', date_from?: string, date_to?: string): Promise<SalesReport[]> {
    const params = new URLSearchParams({ period });
    if (date_from) params.append('date_from', date_from);
    if (date_to) params.append('date_to', date_to);

    const response = await fetch(`${this.baseURL}/reports/sales?${params}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { reports: SalesReport[] } }>(response);
    return result.data.reports || [];
  }

  async getTopProducts(limit: number = 10, date_from?: string, date_to?: string): Promise<TopProduct[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (date_from) params.append('date_from', date_from);
    if (date_to) params.append('date_to', date_to);

    const response = await fetch(`${this.baseURL}/reports/top-products?${params}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { products: TopProduct[] } }>(response);
    return result.data.products || [];
  }

  async getInventoryReport(): Promise<{ products: InventoryReport[], summary: InventorySummary }> {
    const response = await fetch(`${this.baseURL}/reports/inventory`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { products: InventoryReport[], summary: InventorySummary } }>(response);
    return result.data;
  }

  async getOrderStats(date_from?: string, date_to?: string): Promise<OrderStats> {
    const params = new URLSearchParams();
    if (date_from) params.append('date_from', date_from);
    if (date_to) params.append('date_to', date_to);

    const response = await fetch(`${this.baseURL}/orders/stats?${params}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { stats: OrderStats } }>(response);
    return result.data.stats;
  }

  async getStockInStats(date_from?: string, date_to?: string): Promise<StockInStats> {
    const params = new URLSearchParams();
    if (date_from) params.append('date_from', date_from);
    if (date_to) params.append('date_to', date_to);

    const response = await fetch(`${this.baseURL}/stock-in/stats?${params}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { stats: StockInStats } }>(response);
    return result.data.stats;
  }
}

const reportsService = new ReportsService();

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
  change?: number;
  changeText?: string;
}> = ({ title, value, icon, color, change, changeText }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-title">{title}</p>
        {change !== undefined && (
          <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? '↗' : '↘'} {Math.abs(change)}% {changeText}
          </div>
        )}
      </div>
    </div>
  );
};

// Bar Chart Component
const BarChart: React.FC<{
  data: SalesReport[];
  title: string;
  type: 'revenue' | 'orders';
  color?: string;
}> = ({ data, title, type, color = '#007bff' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h4>{title}</h4>
        <div className="empty-chart">Không có dữ liệu</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => 
    type === 'revenue' ? item.total_revenue : item.total_orders
  ));
  const chartHeight = 200;

  return (
    <div className="chart-container">
      <h4>{title}</h4>
      <div className="bar-chart">
        {data.map((item, index) => {
          const value = type === 'revenue' ? item.total_revenue : item.total_orders;
          const height = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
          
          return (
            <div key={index} className="bar-item">
              <div
                className="bar"
                style={{
                  height: `${height}px`,
                  backgroundColor: color,
                }}
                title={`${item.period}: ${type === 'revenue' ? formatCurrency(value) : formatNumber(value)}`}
              ></div>
              <div className="bar-label">{item.period.split('-').pop()}</div>
              <div className="bar-value">
                {type === 'revenue' ? formatCurrencyShort(value) : formatNumber(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Pie Chart Component
const PieChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  title: string;
}> = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h4>{title}</h4>
        <div className="empty-chart">Không có dữ liệu</div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedAngle = 0;

  return (
    <div className="chart-container">
      <h4>{title}</h4>
      <div className="pie-chart">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const x1 = 100 + 80 * Math.cos(accumulatedAngle * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin(accumulatedAngle * Math.PI / 180);
            accumulatedAngle += angle;
            const x2 = 100 + 80 * Math.cos(accumulatedAngle * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin(accumulatedAngle * Math.PI / 180);

            const pathData = [
              `M 100 100`,
              `L ${x1} ${y1}`,
              `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
          <circle cx="100" cy="100" r="40" fill="white" />
        </svg>
        
        <div className="pie-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: item.color }}></div>
              <div className="legend-text">
                <span className="legend-label">{item.label}</span>
                <span className="legend-value">
                  {formatNumber(item.value)} ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Top Products Component
const TopProducts: React.FC<{
  products: TopProduct[];
  loading: boolean;
}> = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="report-card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-card">
      <div className="card-header">
        <h3 className="card-title">Sản Phẩm Bán Chạy</h3>
        <span className="card-badge">{products.length}</span>
      </div>
      <div className="card-body">
        {products.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">Không có dữ liệu</p>
          </div>
        ) : (
          <div className="products-list">
            {products.map((product, index) => (
              <div key={product.product_id} className="product-item">
                <div className="product-rank">#{index + 1}</div>
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-sku">SKU: {product.sku}</div>
                  <div className="product-stats">
                    <span className="sold-count">Đã bán: {formatNumber(product.total_sold)}</span>
                    <span className="revenue">Doanh thu: {formatCurrency(product.total_revenue)}</span>
                    <span className="orders">Đơn hàng: {formatNumber(product.total_orders)}</span>
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

// Inventory Report Component
const InventoryReport: React.FC<{
  report: { products: InventoryReport[], summary: InventorySummary };
  loading: boolean;
}> = ({ report, loading }) => {
  const { products, summary } = report;

  const stockStatusData = [
    { label: 'Sắp hết', value: summary.low_stock, color: '#dc3545' },
    { label: 'Bình thường', value: summary.normal_stock, color: '#28a745' },
    { label: 'Tồn nhiều', value: summary.high_stock, color: '#ffc107' }
  ];

  if (loading) {
    return (
      <div className="report-card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-card">
      <div className="card-header">
        <h3 className="card-title">Báo Cáo Tồn Kho</h3>
        <span className="card-badge">{summary.total_products}</span>
      </div>
      <div className="card-body">
        <div className="inventory-stats">
          <div className="inventory-stat">
            <div className="stat-number">{formatNumber(summary.total_products)}</div>
            <div className="stat-label">Tổng sản phẩm</div>
          </div>
          <div className="inventory-stat">
            <div className="stat-number" style={{ color: '#dc3545' }}>
              {formatNumber(summary.low_stock)}
            </div>
            <div className="stat-label">Sắp hết hàng</div>
          </div>
          <div className="inventory-stat">
            <div className="stat-number" style={{ color: '#28a745' }}>
              {formatNumber(summary.normal_stock)}
            </div>
            <div className="stat-label">Bình thường</div>
          </div>
          <div className="inventory-stat">
            <div className="stat-number" style={{ color: '#ffc107' }}>
              {formatNumber(summary.high_stock)}
            </div>
            <div className="stat-label">Tồn nhiều</div>
          </div>
        </div>

        <PieChart 
          data={stockStatusData}
          title="Phân Loại Tồn Kho"
        />

        <div className="inventory-value">
          <div className="value-label">Tổng giá trị tồn kho:</div>
          <div className="value-amount">{formatCurrency(summary.total_inventory_value)}</div>
        </div>

        {summary.low_stock > 0 && (
          <div className="alert-section">
            <h5>Sản Phẩm Sắp Hết Hàng</h5>
            <div className="alert-list">
              {products
                .filter(p => p.stock_status === 'low')
                .slice(0, 5)
                .map(product => (
                  <div key={product.product_id} className="alert-item">
                    <div className="alert-icon">⚠️</div>
                    <div className="alert-content">
                      <div className="alert-title">{product.name}</div>
                      <div className="alert-desc">
                        Tồn kho: {product.stock_quantity} (Tối thiểu: {product.min_stock})
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Date Range Picker Component
const DateRangePicker: React.FC<{
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading: boolean;
}> = ({ dateFrom, dateTo, onDateFromChange, onDateToChange, onApply, onReset, loading }) => {
  return (
    <div className="date-range-picker">
      <div className="date-inputs">
        <div className="date-input-group">
          <label className="date-label">Từ ngày</label>
          <input
            type="date"
            className="date-input"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="date-input-group">
          <label className="date-label">Đến ngày</label>
          <input
            type="date"
            className="date-input"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="date-actions">
        <button
          className="btn-secondary"
          onClick={onReset}
          disabled={loading}
        >
          Đặt lại
        </button>
        <button
          className="btn-primary"
          onClick={onApply}
          disabled={loading}
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};

// Period Selector Component
const PeriodSelector: React.FC<{
  period: string;
  onPeriodChange: (period: string) => void;
  loading: boolean;
}> = ({ period, onPeriodChange, loading }) => {
  const periods = [
    { value: 'daily', label: 'Theo ngày' },
    { value: 'weekly', label: 'Theo tuần' },
    { value: 'monthly', label: 'Theo tháng' }
  ];

  return (
    <div className="period-selector">
      {periods.map(p => (
        <button
          key={p.value}
          className={`period-btn ${period === p.value ? 'active' : ''}`}
          onClick={() => onPeriodChange(p.value)}
          disabled={loading}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatCurrencyShort = (amount: number): string => {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toString();
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

// Main Reports Component
const Reports: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventoryReport, setInventoryReport] = useState<{ products: InventoryReport[], summary: InventorySummary } | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [stockInStats, setStockInStats] = useState<StockInStats | null>(null);
  
  const [period, setPeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [
        salesReport,
        topProductsData,
        inventoryData,
        orderStatsData,
        stockInStatsData
      ] = await Promise.all([
        reportsService.getSalesReport(period, dateFrom, dateTo),
        reportsService.getTopProducts(10, dateFrom, dateTo),
        reportsService.getInventoryReport(),
        reportsService.getOrderStats(dateFrom, dateTo),
        reportsService.getStockInStats(dateFrom, dateTo)
      ]);

      setSalesData(salesReport);
      setTopProducts(topProductsData);
      setInventoryReport(inventoryData);
      setOrderStats(orderStatsData);
      setStockInStats(stockInStatsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu báo cáo';
      setError(errorMessage);
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    // Reload data when period changes
    setTimeout(() => loadAllReports(), 0);
  };

  const handleDateApply = () => {
    loadAllReports();
  };

  const handleDateReset = () => {
    setDateFrom('');
    setDateTo('');
    setTimeout(() => loadAllReports(), 0);
  };

  if (loading && !orderStats) {
    return (
      <div className="reports">
        <div className="reports-loading">
          <div className="spinner large"></div>
          <p>Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="reports-header">
        <h1>Báo Cáo & Thống Kê</h1>
        <div className="header-actions">
          <button 
            className="btn-refresh"
            onClick={loadAllReports}
            disabled={loading}
          >
            {loading ? '🔄 Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>
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

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label className="filter-label">Chu kỳ báo cáo:</label>
          <PeriodSelector 
            period={period}
            onPeriodChange={handlePeriodChange}
            loading={loading}
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Khoảng thời gian:</label>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApply={handleDateApply}
            onReset={handleDateReset}
            loading={loading}
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <h2>Tổng Quan</h2>
        <div className="stats-grid">
          <StatCard
            title="Doanh Thu"
            value={formatCurrency(orderStats?.total_revenue || 0)}
            icon="💰"
            color="#28a745"
            change={12.5}
            changeText="so với kỳ trước"
          />
          <StatCard
            title="Tổng Đơn Hàng"
            value={formatNumber(orderStats?.total_orders || 0)}
            icon="📦"
            color="#007bff"
            change={8.2}
            changeText="so với kỳ trước"
          />
          <StatCard
            title="Đơn Hàng Hoàn Thành"
            value={formatNumber(orderStats?.completed_orders || 0)}
            icon="✅"
            color="#17a2b8"
            change={15.7}
            changeText="tỷ lệ hoàn thành"
          />
          <StatCard
            title="Giá Trị Đơn Trung Bình"
            value={formatCurrency(orderStats?.avg_order_value || 0)}
            icon="📊"
            color="#6f42c1"
          />
          <StatCard
            title="Phiếu Nhập Kho"
            value={formatNumber(stockInStats?.total_orders || 0)}
            icon="📥"
            color="#fd7e14"
          />
          <StatCard
            title="Giá Trị Nhập Kho"
            value={formatCurrency(stockInStats?.total_value || 0)}
            icon="🏢"
            color="#20c997"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-row">
          <div className="chart-column">
            <div className="report-card">
              <div className="card-header">
                <h3 className="card-title">Doanh Thu Theo Thời Gian</h3>
              </div>
              <div className="card-body">
                <BarChart 
                  data={salesData} 
                  title=""
                  type="revenue"
                  color="#28a745"
                />
              </div>
            </div>
          </div>
          
          <div className="chart-column">
            <div className="report-card">
              <div className="card-header">
                <h3 className="card-title">Số Lượng Đơn Hàng</h3>
              </div>
              <div className="card-body">
                <BarChart 
                  data={salesData} 
                  title=""
                  type="orders"
                  color="#007bff"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Reports */}
      <div className="reports-grid">
        <div className="report-column">
          <TopProducts products={topProducts} loading={loading} />
        </div>
        
        <div className="report-column">
          {inventoryReport && (
            <InventoryReport report={inventoryReport} loading={loading} />
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="additional-stats">
        <div className="stats-row">
          <div className="stat-item">
            <h4>Hiệu Suất Bán Hàng</h4>
            <div className="stat-details">
              <div className="stat-detail">
                <span className="detail-label">Tỷ lệ hoàn thành đơn hàng:</span>
                <span className="detail-value">
                  {orderStats ? ((orderStats.completed_orders / orderStats.total_orders) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="stat-detail">
                <span className="detail-label">Tỷ lệ thanh toán:</span>
                <span className="detail-value">
                  {orderStats ? ((orderStats.paid_orders / orderStats.total_orders) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="stat-item">
            <h4>Hiệu Quả Nhập Kho</h4>
            <div className="stat-details">
              <div className="stat-detail">
                <span className="detail-label">Tỷ lệ xác nhận phiếu nhập:</span>
                <span className="detail-value">
                  {stockInStats ? ((stockInStats.confirmed_orders / stockInStats.total_orders) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="stat-detail">
                <span className="detail-label">Giá trị nhập kho trung bình:</span>
                <span className="detail-value">
                  {formatCurrency(stockInStats?.avg_order_value || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;