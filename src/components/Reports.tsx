// Report.tsx
import React, { useState, useEffect } from 'react';
import './Reports.css';

// Types - Dựa trên backend inventoryController
interface Product {
  product_id: number;
  sku: string;
  product_name: string;
  stock_quantity: number;
  price: number;
  cost_price: number;
  inventory_value: number;
  stock_status: 'out_of_stock' | 'low' | 'normal' | 'high';
  min_stock?: number;
  max_stock?: number;
}

interface InventorySummary {
  total_products: number;
  total_quantity: number;
  total_inventory_value: number;
  out_of_stock_count: number;
  low_stock_count: number;
  normal_stock_count: number;
  high_stock_count: number;
}

interface InventoryReport {
  products: Product[];
  summary: InventorySummary;
  pagination?: {
    current_page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Report Service - Kết nối với backend thực tế
class ReportService {
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

  // Lấy thống kê tồn kho hiện tại
  async getCurrentInventory(search?: string): Promise<InventoryReport> {
    const queryParams = new URLSearchParams();
    if (search) {
      queryParams.append('search', search);
    }

    const url = `${this.baseURL}/inventory/current?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ 
      data: {
        products: Product[];
        summary: InventorySummary;
        pagination: any;
      }
    }>(response);
    
    return {
      products: result.data.products,
      summary: result.data.summary
    };
  }

  // Lấy thống kê tồn kho theo ngày
  async getInventoryByDate(date: string, product_id?: number): Promise<InventoryReport> {
    const queryParams = new URLSearchParams();
    queryParams.append('date', date);
    if (product_id) {
      queryParams.append('product_id', product_id.toString());
    }

    const url = `${this.baseURL}/inventory/by-date?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ 
      data: {
        date: string;
        products: Product[];
        total_products: number;
      }
    }>(response);

    // Chuyển đổi dữ liệu từ API để phù hợp với interface
    const products = result.data.products.map(product => ({
      ...product,
      inventory_value: product.stock_quantity * product.cost_price,
      stock_status: this.calculateStockStatus(product.stock_quantity, product.min_stock, product.max_stock)
    }));

    const summary = this.calculateSummary(products);
    
    return {
      products,
      summary
    };
  }

  // Lấy sản phẩm sắp hết hàng
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    const response = await fetch(`${this.baseURL}/inventory/low-stock?threshold=${threshold}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ 
      data: {
        products: Product[];
        total: number;
        threshold: number;
      }
    }>(response);
    
    return result.data.products;
  }

  // Tính toán trạng thái tồn kho
  private calculateStockStatus(quantity: number, min_stock?: number, max_stock?: number): 'out_of_stock' | 'low' | 'normal' | 'high' {
    if (quantity === 0) return 'out_of_stock';
    if (min_stock && quantity <= min_stock) return 'low';
    if (max_stock && quantity >= max_stock) return 'high';
    return 'normal';
  }

  // Tính toán summary từ danh sách sản phẩm
  private calculateSummary(products: Product[]): InventorySummary {
    return {
      total_products: products.length,
      total_quantity: products.reduce((sum, product) => sum + product.stock_quantity, 0),
      total_inventory_value: products.reduce((sum, product) => sum + (product.stock_quantity * product.cost_price), 0),
      out_of_stock_count: products.filter(p => p.stock_status === 'out_of_stock').length,
      low_stock_count: products.filter(p => p.stock_status === 'low').length,
      normal_stock_count: products.filter(p => p.stock_status === 'normal').length,
      high_stock_count: products.filter(p => p.stock_status === 'high').length
    };
  }
}

const reportService = new ReportService();

// Main Report Component
const Report: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async (date?: string) => {
    setLoading(true);
    setError('');
    
    try {
      let data;
      if (date) {
        data = await reportService.getInventoryByDate(date);
      } else {
        data = await reportService.getCurrentInventory();
      }
      setInventoryData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê';
      setError(errorMessage);
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleViewReport = () => {
    if (selectedDate) {
      loadInventoryData(selectedDate);
    } else {
      loadInventoryData();
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInventoryData(selectedDate);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (loading && !inventoryData) {
    return (
      <div className="report-page">
        <div className="loading">
          <p>Đang tải dữ liệu thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Header - Giống hình ảnh */}
      <div className="report-header">
        <h1>Thống kê tồn kho</h1>
        <p className="report-subtitle">Hệ thống quản lý cửa hàng</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Date Filter Section */}
      <div className="date-filter-section">
        <span className="date-filter-label">Tồn kho tính đến ngày:</span>
        <input
          type="date"
          className="date-input"
          value={selectedDate}
          onChange={handleDateChange}
          max={getCurrentDate()}
        />
        <button 
          className="view-report-btn"
          onClick={handleViewReport}
          disabled={loading}
        >
          Xem thống kê
        </button>
      </div>

      {/* Summary Cards */}
      {inventoryData?.summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">{formatNumber(inventoryData.summary.total_products)}</div>
            <div className="summary-label">Tổng sản phẩm</div>
          </div>
          <div className="summary-card">
            <div className="summary-value summary-normal">
              {formatNumber(inventoryData.summary.normal_stock_count + inventoryData.summary.high_stock_count)}
            </div>
            <div className="summary-label">Đủ hàng</div>
          </div>
          <div className="summary-card">
            <div className="summary-value summary-warning">
              {formatNumber(inventoryData.summary.low_stock_count)}
            </div>
            <div className="summary-label">Sắp hết hàng</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {formatNumber(inventoryData.summary.out_of_stock_count)}
            </div>
            <div className="summary-label">Hết hàng</div>
          </div>
        </div>
      )}

      {/* Inventory Table  */}
      <div className="inventory-section">
        <div className="section-header">
          <h2>Danh sách sản phẩm tồn kho</h2>
        </div>
        
        {loading ? (
          <div className="loading">
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : inventoryData?.products && inventoryData.products.length > 0 ? (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Mã SP</th>
                <th>Tên sản phẩm</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.products.map((product) => (
                <tr key={product.product_id}>
                  <td>{product.sku}</td>
                  <td>{product.product_name}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{formatNumber(product.stock_quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="loading">
            <p>Không có dữ liệu tồn kho</p>
          </div>
        )}
      </div>

      {/* Inventory Value Summary  */}
      {inventoryData?.summary && (
        <div className="inventory-value-section">
          <h3>Tổng giá trị tồn kho</h3>
          <div className="value-grid">
            <div className="value-item">
              <div className="value-amount">{formatNumber(inventoryData.summary.total_quantity)} sản phẩm</div>
              <div className="value-label">Tổng số lượng</div>
            </div>
            <div className="value-item">
              <div className="value-amount">{formatCurrency(inventoryData.summary.total_inventory_value)}</div>
              <div className="value-label">Tổng giá trị</div>
            </div>
            <div className="value-item">
              <div className="value-amount">
                {inventoryData.summary.total_products > 0 
                  ? formatCurrency(inventoryData.summary.total_inventory_value / inventoryData.summary.total_products)
                  : formatCurrency(0)
                }
              </div>
              <div className="value-label">Giá trị trung bình/SP</div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Out Section */}
      <div className="stock-out-section">
        <h3>Hết hàng</h3>
        <div className="stock-out-value">
          {inventoryData?.summary ? formatNumber(inventoryData.summary.out_of_stock_count) : '0'}
        </div>
      </div>

    
    </div>
  );
};

export default Report;