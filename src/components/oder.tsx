// OrderManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaTimes, 
  FaSearch,
  FaExclamationTriangle,
  FaCheck,
  FaSpinner
} from 'react-icons/fa';
import './order.css';
import OrderForm from './OrderForm';
import type { OrderItem, OrderFormData } from './OrderForm';
import OrderModal from './OrderModal';
import {OrderDetailsModal} from './OrderModal';
export interface Order {
  order_id: number;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  created_by: number;
  created_by_name?: string;
  subtotal: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_status: string;
  order_status: string;
  note?: string;
  created_at: string;
  items?: OrderItem[];
}



interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Order Service 
class OrderService {
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
  async getOrdersByCustomer(customer_id: number): Promise<Order[]> {
  const response = await fetch(`${this.baseURL}/orders/customer/${customer_id}`, {
    headers: this.getAuthHeaders(),
  });

  const result = await this.handleResponse<{ data: Order[] }>(response);
  return result.data;
}

  async getAllOrders(page: number = 1, limit: number = 10, search: string = '', status?: string, payment_status?: string): Promise<{ orders: Order[], pagination: PaginationInfo }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(status && { status }),
      ...(payment_status && { payment_status })
    });

    const response = await fetch(`${this.baseURL}/orders?${params}`, {
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

  async getOrderById(id: number): Promise<Order> {
    const response = await fetch(`${this.baseURL}/orders/${id}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { order: Order } }>(response);
    return result.data.order;
  }

  async createOrder(orderData: OrderFormData): Promise<number> {
    const response = await fetch(`${this.baseURL}/orders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderData),
    });

    const result = await this.handleResponse<{ data: { order_id: number } }>(response);
    return result.data.order_id;
  }

  async updateOrderStatus(id: number, updateData: { order_status?: string, payment_status?: string, note?: string }): Promise<void> {
    const response = await fetch(`${this.baseURL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    await this.handleResponse(response);
  }

  async cancelOrder(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/orders/${id}/cancel`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }
}

const orderService = new OrderService();


// Order List Component
interface OrderListProps {
  orders: Order[];
  pagination: PaginationInfo;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (order: Order) => void;
  onCancel: (order: Order) => void;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const OrderList: React.FC<OrderListProps> = ({
  orders,
  pagination,
  onViewDetails,
  onUpdateStatus,
  onCancel,
  onPageChange,
  loading,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
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
        <ul className="pagination justify-content-center">
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
      <div className="order-card">
        <div className="loading">
          <FaSpinner className="spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-card">
      <div className="order-card-header">
        <h5 className="order-card-title">Danh sách đơn hàng</h5>
        <div className="order-count">
          Tổng: {pagination?.total || 0} đơn hàng
        </div>
      </div>
      <div className="order-card-body">
        <div className="table-responsive">
          <table className="order-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th>Ngày tạo</th>
                {/* <th>Ghi chú</th> */}
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td>{order.order_id}</td>
                  <td>
                    <div className="order-customer">
                      {order.customer_name || 'Khách vãng lai'}
                    </div>
                    {order.customer_phone && (
                      <div className="order-note">{order.customer_phone}</div>
                    )}
                  </td>
                  <td className="amount">{formatCurrency(order.final_amount)}</td>
                  <td>
                    <span className={`status-badge ${order.order_status}`}>
                      {getStatusText(order.order_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`payment-status-badge ${order.payment_status}`}>
                      {getPaymentStatusText(order.payment_status)}
                    </span>
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                  {/* <td>
                    {order.note && (
                      <div className="order-note">{order.note}</div>
                    )}
                  </td> */}
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-info"
                        onClick={() => onViewDetails(order)}
                        title="Xem chi tiết"
                        disabled={loading}
                      >
                        <FaEye />
                      </button>
                      <button
                        className="btn-warning"
                        onClick={() => onUpdateStatus(order)}
                        title="Cập nhật trạng thái"
                        disabled={loading || order.order_status === 'cancelled'}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => onCancel(order)}
                        title="Hủy đơn hàng"
                        disabled={loading || order.order_status === 'cancelled'}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && !loading && (
          <div className="empty-state">
            <p className="empty-text">Không có đơn hàng nào</p>
          </div>
        )}

        {renderPagination()}
      </div>
    </div>
  );
};

// Order Details Component
interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: () => void;
  loading?: boolean;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ 
  order, 
  onClose, 
  onUpdateStatus,
  loading = false 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
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

  return (
    <div className="order-card">
      <div className="order-card-header">
        <h5 className="order-card-title">Chi tiết đơn hàng #{order.order_id}</h5>
        <button 
          type="button" 
          className="close-btn" 
          onClick={onClose}
          disabled={loading}
        >
          <FaTimes />
        </button>
      </div>
      <div className="order-card-body">
        <div className="detail-row">
          <div className="detail-label">ID:</div>
          <div className="detail-value">#{order.order_id}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Khách hàng:</div>
          <div className="detail-value">
            {order.customer_name}
            {order.customer_phone && ` - ${order.customer_phone}`}
            {order.customer_email && ` (${order.customer_email})`}
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Người tạo:</div>
          <div className="detail-value">{order.created_by_name || 'Unknown'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Tổng tiền:</div>
          <div className="detail-value amount">{formatCurrency(order.final_amount)}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Giảm giá:</div>
          <div className="detail-value">{formatCurrency(order.discount)}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Thuế:</div>
          <div className="detail-value">{formatCurrency(order.tax)}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Trạng thái:</div>
          <div className="detail-value">
            <span className={`status-badge ${order.order_status}`}>
              {getStatusText(order.order_status)}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Thanh toán:</div>
          <div className="detail-value">
            <span className={`payment-status-badge ${order.payment_status}`}>
              {getPaymentStatusText(order.payment_status)}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Ghi chú:</div>
          <div className="detail-value">{order.note || '-'}</div>
        </div>

       {/* --- DANH SÁCH SẢN PHẨM --- */}
<div className="detail-row-items">
  <div className="detail-label">Danh sách mua hàng:</div>
  <div className="detail-value">

    {!order.items || order.items.length === 0 ? (
      <div className="empty-state">
        <p className="empty-text">Đơn hàng không có sản phẩm</p>
      </div>
    ) : (
      <div>
      <table className="order-detail-items-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Mã SP</th>
            <th>Số lượng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td>{item.product_name || `Sản phẩm #${item.product_id}`}</td>
              <td>{item.product_sku || "-"}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unit_price)}</td>
              <td>{formatCurrency(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    )}

  </div>
</div>


        <div className="detail-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Đóng
          </button>
          <button 
            className="btn-primary" 
            onClick={onUpdateStatus}
            disabled={loading || order.order_status === 'cancelled'}
          >
            Cập nhật trạng thái
          </button>
        </div>
      </div>
    </div>
  );
};

// Order Status Form Component
interface OrderStatusFormProps {
  order: Order;
  onSubmit: (data: { order_status?: string, payment_status?: string, note?: string }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const OrderStatusForm: React.FC<OrderStatusFormProps> = ({
  order,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState({
    order_status: order.order_status,
    payment_status: order.payment_status,
    note: order.note || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="order-card">
      <div className="order-card-header">
        <h5 className="order-card-title">
          Cập nhật trạng thái đơn hàng #{order.order_id}
        </h5>
      </div>
      <div className="order-card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="order_status" className="form-label">
              Trạng thái đơn hàng
            </label>
            <select
              className="form-select"
              id="order_status"
              name="order_status"
              value={formData.order_status}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="draft">Nháp</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payment_status" className="form-label">
              Trạng thái thanh toán
            </label>
            <select
              className="form-select"
              id="payment_status"
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="pending">Chờ thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="note" className="form-label">Ghi chú</label>
            <textarea
              className="form-textarea"
              id="note"
              name="note"
              rows={3}
              value={formData.note}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner-small" />
                  Đang xử lý...
                </>
              ) : (
                'Cập nhật'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Order Management Component
const OrderManagement: React.FC = () => {
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    loadOrders();
  }, [pagination.page, pagination.limit, statusFilter, paymentStatusFilter]);
  
  const showMessage = (message: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    
    setTimeout(() => {
      if (type === 'error') {
        setError('');
      } else {
        setSuccess('');
      }
    }, 5000);
  };

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orderService.getAllOrders(
        pagination.page,
        pagination.limit,
        searchTerm,
        statusFilter,
        paymentStatusFilter
      );
      setOrders(response.orders);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng';
      showMessage(errorMessage, 'error');
      console.error('Error loading orders:', err);
      
      // Fallback để tránh crash
      setOrders([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadOrders();
  };

  const handleCreateOrder = async (FormData : OrderFormData) => {
    setFormLoading(true);
    try {
      await orderService.createOrder(FormData);
      setShowForm(false);
      showMessage('Thêm đơn hàng thành công!', 'success');
      loadOrders();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi tạo đơn hàng';
      showMessage(errorMessage, 'error');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };
  

  const handleUpdateOrderStatus = async (updateData: { order_status?: string, payment_status?: string, note?: string }) => {
    if (!updatingOrder) return;

    setFormLoading(true);
    try {
      await orderService.updateOrderStatus(updatingOrder.order_id, updateData);
      setUpdatingOrder(null);
      showMessage('Cập nhật trạng thái đơn hàng thành công!', 'success');
      loadOrders();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái đơn hàng';
      showMessage(errorMessage, 'error');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
  if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng #${order.order_id}?`)) {
    return;
  }

  setLoading(true);
  try {
    await orderService.cancelOrder(order.order_id);
    showMessage('Hủy đơn hàng thành công!', 'success');
    loadOrders();
  } catch (err) {
    let errorMessage = 'Không thể hủy đơn hàng';

    if (err instanceof Error) {
      // nếu lỗi là quyền
      if (err.message.includes('Access denied')) {
        errorMessage = 'Bạn không có quyền hủy đơn hàng này';
      } else {
        errorMessage = err.message;
      }
    }

    showMessage(errorMessage, 'error');
    console.error('Error cancelling order:', err);
  } finally {
    setLoading(false);
  }
};


  const handleViewDetails = async (order: Order) => {
    setLoading(true);
    try {
      const fullOrder = await orderService.getOrderById(order.order_id);
      setSelectedOrder(fullOrder);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng';
      showMessage(errorMessage, 'error');
      console.error('Error loading order details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (order: Order) => {
    setUpdatingOrder(order);
    setSelectedOrder(null);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const resetView = () => {
    setSelectedOrder(null);
    setUpdatingOrder(null);
    setError('');
    setShowForm(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
    loadOrders();
  };

  return (
    <div className="order-management">
      <div className="order-header">
        <h1>Quản Lý Đơn Hàng</h1>
        <button
          className='btn-primary'
          onClick={() => {
            resetView();
            setShowForm(true);
          }}
          disabled={loading}
        >
          + Tạo đơn hàng
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <div className="alert-content">
            <FaExclamationTriangle className="alert-icon" />
            {error}
          </div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setError('')}
          >
            <FaTimes />
          </button>
        </div>
      )}

      {success && (
        <div className="success-alert">
          <div className="alert-content">
            <FaCheck className="alert-icon" />
            {success}
          </div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccess('')}
          >
            <FaTimes />
          </button>
        </div>
      )}

      <div className="filters-section">
        <form onSubmit={handleSearch}>
          <div className="filters-row">
            <div className="search-group">
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm theo ID, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                <FaSearch />
              </button>
            </div> 
          </div>
        </form>
      </div>


      <div className="order-content">
        <div className={selectedOrder || updatingOrder ? 'main-content' : 'full-content'}>
          <OrderList
            orders={orders}
            pagination={pagination}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onCancel={handleCancelOrder}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>

        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdateStatus={() => {
              setUpdatingOrder(selectedOrder);
              setSelectedOrder(null);
            }}
            loading={loading}
          />
        )}

        {(showForm || selectedOrder || updatingOrder) && (
          <div className="sidebar-content">
            
            {showForm && (
              <OrderModal
                onSubmit={handleCreateOrder}
                onClose={() => setShowForm(false)}
                loading={formLoading}
              />
            )}

         
            {selectedOrder && (
              <OrderDetails
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdateStatus={() => {
                  setUpdatingOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                loading={loading}
              />
            )}

            {updatingOrder && (
              <OrderStatusForm
                order={updatingOrder}
                onSubmit={handleUpdateOrderStatus}
                onCancel={() => setUpdatingOrder(null)}
                loading={formLoading}
              />
            )}

          </div>
        )}
      </div>
    </div>
  )

};


export default OrderManagement;