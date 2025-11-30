// components/Search.tsx
import React, { useState, useEffect } from 'react';
import './Serch.css';

// Types
interface Product {
  product_id: number;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  status: string;
  category_name?: string;
}

interface Order {
  order_id: number;
  customer_name?: string;
  final_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

interface SearchResult {
  products: Product[];
  orders: Order[];
}

// Search Service - FIXED VERSION
class SearchService {
  private baseURL = 'http://localhost:5000/api';

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Kiểm tra cấu trúc response từ backend
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  }

  async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    try {
      console.log('🔍 Searching products with query:', query);
      
      // Thử cả 2 endpoint có thể có
      let response;
      
      // Thử endpoint search chuyên dụng trước
      try {
        response = await fetch(`${this.baseURL}/products/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
          headers: this.getAuthHeaders(),
        });
      } catch (error) {
        console.log('Search endpoint failed, trying general endpoint...');
        // Fallback: sử dụng endpoint getAll với tham số search
        response = await fetch(`${this.baseURL}/products?search=${encodeURIComponent(query)}&limit=${limit}`, {
          headers: this.getAuthHeaders(),
        });
      }

      const result = await this.handleResponse(response);
      
      // Xử lý các cấu trúc response khác nhau
      if (result.data && Array.isArray(result.data.products)) {
        return result.data.products;
      } else if (result.data && Array.isArray(result.data)) {
        return result.data;
      } else if (Array.isArray(result.products)) {
        return result.products;
      } else if (Array.isArray(result.data)) {
        return result.data;
      }
      
      console.warn('Unexpected response structure:', result);
      return [];
      
    } catch (error) {
      console.error('❌ Search products error:', error);
      
      // Fallback: thử endpoint getAll
      try {
        console.log('🔄 Trying fallback search...');
        const fallbackResponse = await fetch(`${this.baseURL}/products?search=${encodeURIComponent(query)}&limit=${limit}`, {
          headers: this.getAuthHeaders(),
        });
        
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          return fallbackResult.data || fallbackResult.products || [];
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      return [];
    }
  }

  async searchOrders(query: string, limit: number = 10): Promise<Order[]> {
    try {
      console.log('🔍 Searching orders with query:', query);
      
      const response = await fetch(`${this.baseURL}/orders?search=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });

      const result = await this.handleResponse(response);
      
      // Xử lý các cấu trúc response khác nhau
      if (result.data && Array.isArray(result.data)) {
        return result.data;
      } else if (Array.isArray(result.orders)) {
        return result.orders;
      } else if (Array.isArray(result.data)) {
        return result.data;
      }
      
      console.warn('Unexpected orders response structure:', result);
      return [];
      
    } catch (error) {
      console.error('❌ Search orders error:', error);
      return [];
    }
  }

  async globalSearch(query: string): Promise<SearchResult> {
    try {
      console.log('🌐 Starting global search for:', query);
      
      const [products, orders] = await Promise.all([
        this.searchProducts(query, 10),
        this.searchOrders(query, 10)
      ]);

      console.log('✅ Search results:', { 
        products: products.length, 
        orders: orders.length 
      });

      return { products, orders };
    } catch (error) {
      console.error('❌ Global search error:', error);
      return { products: [], orders: [] };
    }
  }
}

const searchService = new SearchService();

// Search Component
const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'products' | 'orders'>('all');
  const [results, setResults] = useState<SearchResult>({ products: [], orders: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setSearchError('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSearchError('');
    setResults({ products: [], orders: [] });

    try {
      const searchResult = await searchService.globalSearch(searchQuery);
      setResults(searchResult);
      
      // Kiểm tra nếu không có kết quả
      if (searchResult.products.length === 0 && searchResult.orders.length === 0) {
        setSearchError('Không tìm thấy kết quả nào phù hợp');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tìm kiếm';
      setSearchError(errorMessage);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string): { text: string; class: string } => {
    const statusMap: { [key: string]: { text: string; class: string } } = {
      'active': { text: 'Hoạt động', class: 'active' },
      'inactive': { text: 'Ngừng hoạt động', class: 'inactive' },
      'draft': { text: 'Nháp', class: 'draft' },
      'completed': { text: 'Hoàn thành', class: 'completed' },
      'confirmed': { text: 'Đã xác nhận', class: 'confirmed' },
      'pending': { text: 'Chờ xử lý', class: 'pending' },
      'cancelled': { text: 'Đã hủy', class: 'cancelled' },
      'paid': { text: 'Đã thanh toán', class: 'paid' }
    };
    
    return statusMap[status] || { text: status, class: 'default' };
  };

  const getStockStatus = (quantity: number): { text: string; class: string } => {
    if (quantity === 0) return { text: 'Hết hàng', class: 'out-of-stock' };
    if (quantity < 10) return { text: 'Sắp hết', class: 'low-stock' };
    return { text: 'Còn hàng', class: 'in-stock' };
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults({ products: [], orders: [] });
    setHasSearched(false);
    setSearchError('');
  };

  return (
    <div className="search-page">
      {/* Header */}
      <div className="search-header">
        <h1>🔍 Tìm kiếm</h1>
        <p className="search-subtitle">Tìm kiếm sản phẩm và đơn hàng</p>
      </div>

      {/* Search Form */}
      <div className="search-card">
        <div className="search-form">
          <div className="form-group">
            <label className="form-label">Loại tìm kiếm</label>
            <div className="search-type-tabs">
              <button
                type="button"
                className={`tab-button ${searchType === 'all' ? 'active' : ''}`}
                onClick={() => setSearchType('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`tab-button ${searchType === 'products' ? 'active' : ''}`}
                onClick={() => setSearchType('products')}
              >
                Sản phẩm
              </button>
              <button
                type="button"
                className={`tab-button ${searchType === 'orders' ? 'active' : ''}`}
                onClick={() => setSearchType('orders')}
              >
                Đơn hàng
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label className="form-label">Từ khóa</label>
              <div className="search-input-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Nhập từ khóa tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="search-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Đang tìm...
                    </>
                  ) : (
                    '🔍 Tìm kiếm'
                  )}
                </button>
                {hasSearched && (
                  <button 
                    type="button" 
                    className="clear-search-btn"
                    onClick={clearSearch}
                    disabled={loading}
                  >
                    Xóa
                  </button>
                )}
              </div>
              {searchError && (
                <div className="search-error">{searchError}</div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="error-alert">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            {searchError}
          </div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSearchError('')}
          >×</button>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="results-section">
          {/* Products Results */}
          {(searchType === 'all' || searchType === 'products') && (
            <div className="results-card">
              <div className="results-header">
                <h3>Kết quả tìm kiếm sản phẩm</h3>
                <span className="results-count">
                  {results.products.length} kết quả
                </span>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Đang tìm kiếm sản phẩm...</p>
                </div>
              ) : results.products.length > 0 ? (
                <div className="table-responsive">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Mã SP</th>
                        <th>Tên sản phẩm</th>
                        <th>Giá bán</th>
                        <th>Tồn kho</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.products.map((product) => {
                        const stockStatus = getStockStatus(product.stock_quantity);
                        const statusBadge = getStatusBadge(product.status);
                        return (
                          <tr key={product.product_id}>
                            <td className="product-sku">{product.sku || `SP${product.product_id}`}</td>
                            <td className="product-name">{product.name}</td>
                            <td className="product-price">{formatCurrency(product.price)}</td>
                            <td className="product-stock">
                              <span className="stock-quantity">{product.stock_quantity}</span>
                              <span className={`stock-badge ${stockStatus.class}`}>
                                {stockStatus.text}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${statusBadge.class}`}>
                                {statusBadge.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-text">Không tìm thấy sản phẩm nào phù hợp</p>
                  <p className="empty-hint">Thử với từ khóa khác hoặc kiểm tra kết nối</p>
                </div>
              )}
            </div>
          )}

          {/* Orders Results */}
          {(searchType === 'all' || searchType === 'orders') && (
            <div className="results-card">
              <div className="results-header">
                <h3>Kết quả tìm kiếm đơn hàng</h3>
                <span className="results-count">
                  {results.orders.length} kết quả
                </span>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Đang tìm kiếm đơn hàng...</p>
                </div>
              ) : results.orders.length > 0 ? (
                <div className="table-responsive">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Mã ĐH</th>
                        <th>Khách hàng</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.orders.map((order) => {
                        const statusBadge = getStatusBadge(order.order_status);
                        const paymentBadge = getStatusBadge(order.payment_status);
                        return (
                          <tr key={order.order_id}>
                            <td className="order-id">#{order.order_id}</td>
                            <td className="customer-name">{order.customer_name || 'Khách vãng lai'}</td>
                            <td className="order-amount">{formatCurrency(order.final_amount)}</td>
                            <td>
                              <span className={`status-badge ${statusBadge.class}`}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${paymentBadge.class}`}>
                                {paymentBadge.text}
                              </span>
                            </td>
                            <td className="order-date">{formatDate(order.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-text">Không tìm thấy đơn hàng nào phù hợp</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && (
        <div className="initial-state">
          <div className="initial-card">
            <div className="initial-icon">🔍</div>
            <h3>Bắt đầu tìm kiếm</h3>
            <p>Nhập từ khóa và nhấn "Tìm kiếm" để tìm kiếm sản phẩm và đơn hàng</p>
            <div className="search-tips">
              <h4>Mẹo tìm kiếm:</h4>
              <ul>
                <li>Tìm theo tên sản phẩm, mã SKU</li>
                <li>Tìm theo mã đơn hàng, tên khách hàng</li>
                <li>Sử dụng từ khóa cụ thể để kết quả chính xác hơn</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;