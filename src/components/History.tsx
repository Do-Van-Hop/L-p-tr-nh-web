// CustomerHistory.tsx
import React, { useState, useEffect } from 'react';
import './History.css';

// Types
interface Customer {
  customer_id: number;
  name: string;
  phone?: string;
  email?: string;
  loyalty_points: number;
}

interface Order {
  order_id: number;
  customer_id: number;
  final_amount: number;
  payment_status: string;
  order_status: string;
  created_at: string;
  items: OrderItem[];
}

interface OrderItem {
  order_item_id: number;
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Customer Service
class CustomerService {
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

  async getAllCustomers(): Promise<Customer[]> {
    const response = await fetch(`${this.baseURL}/customers?limit=1000`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: Customer[] }>(response);
    return result.data || [];
  }

  async getPurchaseHistory(customerId: number, page: number = 1, limit: number = 10): Promise<{ orders: Order[], pagination: PaginationInfo }> {
    const response = await fetch(`${this.baseURL}/customers/${customerId}/purchase-history?page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: Order[], pagination: PaginationInfo }>(response);
    return {
      orders: result.data || [],
      pagination: result.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    };
  }
}

const customerService = new CustomerService();

// Customer Selection Component
interface CustomerSelectionProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  loading: boolean;
}

const CustomerSelection: React.FC<CustomerSelectionProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  loading
}) => {
  return (
    <div className="customer-history-card">
      <div className="customer-history-card-header">
        <h5 className="customer-history-card-title">Chọn khách hàng</h5>
      </div>
      <div className="customer-history-card-body">
        <div className="form-group">
          <label className="form-label">Khách hàng</label>
          <select
            className="form-input"
            value={selectedCustomer?.customer_id || ''}
            onChange={(e) => {
              const customerId = e.target.value;
              if (customerId === '') {
                onSelectCustomer(null);
              } else {
                const customer = customers.find(c => c.customer_id.toString() === customerId);
                onSelectCustomer(customer || null);
              }
            }}
            disabled={loading}
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map(customer => (
              <option key={customer.customer_id} value={customer.customer_id}>
                {customer.name} {customer.phone ? `(${customer.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="customer-info">
            <div className="info-row">
              <span className="info-label">Tên:</span>
              <span className="info-value">{selectedCustomer.name}</span>
            </div>
            {selectedCustomer.phone && (
              <div className="info-row">
                <span className="info-label">Điện thoại:</span>
                <span className="info-value">{selectedCustomer.phone}</span>
              </div>
            )}
            {selectedCustomer.email && (
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{selectedCustomer.email}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Điểm tích lũy:</span>
              <span className="info-value points">{selectedCustomer.loyalty_points} điểm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Order History Component
interface OrderHistoryProps {
  orders: Order[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  pagination,
  onPageChange,
  loading
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { class: string; text: string } } = {
      'completed': { class: 'status-completed', text: 'Hoàn thành' },
      'pending': { class: 'status-pending', text: 'Đang xử lý' },
      'cancelled': { class: 'status-cancelled', text: 'Đã hủy' },
      'draft': { class: 'status-draft', text: 'Nháp' }
    };

    const config = statusConfig[status] || { class: 'status-default', text: status };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { class: string; text: string } } = {
      'paid': { class: 'payment-paid', text: 'Đã thanh toán' },
      'pending': { class: 'payment-pending', text: 'Chờ thanh toán' },
      'failed': { class: 'payment-failed', text: 'Thất bại' }
    };

    const config = statusConfig[status] || { class: 'payment-default', text: status };
    return <span className={`payment-badge ${config.class}`}>{config.text}</span>;
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pages = [];
    const { page, totalPages } = pagination;
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${i === page ? 'active' : ''}`}>
          <button 
            className="page-link" 
            onClick={() => onPageChange(i)}
            disabled={loading}
          >
            {i}
          </button>
        </li>
      );
    }

    return (
      <nav>
        <ul className="pagination">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || loading}
            >
              ‹
            </button>
          </li>
          {pages}
          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages || loading}
            >
              ›
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className="customer-history-card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải lịch sử mua hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-history-card">
      <div className="customer-history-card-header">
        <h5 className="customer-history-card-title">Lịch sử mua hàng</h5>
        {pagination.total > 0 && (
          <div className="order-count">
            Tổng: {pagination.total} đơn hàng
          </div>
        )}
      </div>
      <div className="customer-history-card-body">
        {orders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">Không có đơn hàng nào</p>
          </div>
        ) : (
          <>
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.order_id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <span className="order-id">Đơn hàng #{order.order_id}</span>
                      <span className="order-date">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="order-status">
                      {getStatusBadge(order.order_status)}
                      {getPaymentStatusBadge(order.payment_status)}
                    </div>
                  </div>
                  
                  <div className="order-items">
                    {order.items && order.items.map(item => (
                      <div key={item.order_item_id} className="order-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">x{item.quantity}</span>
                        <span className="item-price">{formatCurrency(item.unit_price)}</span>
                       
                      </div>
                    ))}
                  </div>
                  
                  <div className="order-footer">
                    <div className="order-total">
                      Tổng cộng: <strong>{formatCurrency(order.final_amount)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

// Main Customer History Component
const CustomerHistory: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadPurchaseHistory();
    } else {
      setOrders([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    }
  }, [selectedCustomer, pagination.page]);

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const customerList = await customerService.getAllCustomers();
      setCustomers(customerList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng';
      setError(errorMessage);
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    if (!selectedCustomer) return;

    setHistoryLoading(true);
    setError('');
    try {
      const response = await customerService.getPurchaseHistory(
        selectedCustomer.customer_id,
        pagination.page,
        pagination.limit
      );
      setOrders(response.orders);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải lịch sử mua hàng';
      setError(errorMessage);
      console.error('Error loading purchase history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className="customer-history">
      <div className="customer-history-header">
        <h1>Lịch sử mua hàng khách hàng</h1>
        <p className="page-description">Xem lịch sử mua hàng của từng khách hàng</p>
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

      <div className="customer-history-content">
        <div className="selection-section">
          <CustomerSelection
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            loading={loading}
          />
        </div>

        <div className="history-section">
          {!selectedCustomer ? (
            <div className="placeholder-card">
              <div className="placeholder-content">
                <p>Vui lòng chọn khách hàng để xem lịch sử mua hàng</p>
              </div>
            </div>
          ) : (
            <OrderHistory
              orders={orders}
              pagination={pagination}
              onPageChange={handlePageChange}
              loading={historyLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHistory;