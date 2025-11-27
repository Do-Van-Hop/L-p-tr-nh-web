// CustomerManagement.tsx
import React, { useState, useEffect } from 'react';
import './customer.css';
// Types
interface Customer {
  customer_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyalty_points: number;
  created_at: string;
}

interface CustomerFormData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyalty_points?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomersResponse {
  success: boolean;
  data: {
    customers: Customer[];
  };
  pagination: PaginationInfo;
}

// Customer Service với error handling tốt hơn
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

  async getAllCustomers(page: number = 1, limit: number = 10, search: string = ''): Promise<{ customers: Customer[], pagination: PaginationInfo }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });

    const response = await fetch(`${this.baseURL}/customers?${params}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<CustomersResponse>(response);
    
    // Đảm bảo structure luôn đúng
    return {
      customers: result.data?.customers || [],
      pagination: result.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    };
  }

  async getCustomerById(id: number): Promise<Customer> {
    const response = await fetch(`${this.baseURL}/customers/${id}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { customer: Customer } }>(response);
    return result.data.customer;
  }

  async createCustomer(customerData: CustomerFormData): Promise<number> {
    const response = await fetch(`${this.baseURL}/customers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(customerData),
    });

    const result = await this.handleResponse<{ data: { customer_id: number } }>(response);
    return result.data.customer_id;
  }

  async updateCustomer(id: number, customerData: Partial<CustomerFormData>): Promise<void> {
    const response = await fetch(`${this.baseURL}/customers/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(customerData),
    });

    await this.handleResponse(response);
  }

  async deleteCustomer(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/customers/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  async searchCustomers(query: string, limit: number = 10): Promise<Customer[]> {
    const response = await fetch(`${this.baseURL}/customers/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { customers: Customer[] } }>(response);
    return result.data.customers;
  }

  async updateLoyaltyPoints(id: number, points: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/customers/${id}/loyalty-points`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ points }),
    });

    await this.handleResponse(response);
  }
}

const customerService = new CustomerService();

// Customer List Component
interface CustomerListProps {
  customers: Customer[];
  pagination: PaginationInfo;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetails: (customer: Customer) => void;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  pagination,
  onEdit,
  onDelete,
  onViewDetails,
  onPageChange,
  loading,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
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

  if (loading && customers.length === 0) {
    return (
      <div className="customer-card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-card">
      <div className="customer-card-header">
        <h5 className="customer-card-title">Danh sách khách hàng</h5>
        <div className="customer-count">
          Tổng: {pagination?.total || 0} khách hàng
        </div>
      </div>
      <div className="customer-card-body">
        <div className="table-responsive">
          <table className="customer-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Điểm tích lũy</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td>{customer.customer_id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>
                    <span className="loyalty-badge">{customer.loyalty_points}</span>
                  </td>
                  <td>{formatDate(customer.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-info"
                        onClick={() => onViewDetails(customer)}
                        title="Xem chi tiết"
                        disabled={loading}
                      >
                        👁️
                      </button>
                      <button
                        className="btn-warning"
                        onClick={() => onEdit(customer)}
                        title="Sửa"
                        disabled={loading}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => onDelete(customer)}
                        title="Xóa"
                        disabled={loading}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && !loading && (
          <div className="empty-state">
            <p className="empty-text">Không có khách hàng nào</p>
          </div>
        )}

        {renderPagination()}
      </div>
    </div>
  );
};

// Customer Form Component
interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    loyalty_points: 0,
  });

  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        loyalty_points: customer.loyalty_points,
      });
    }
  }, [customer]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên khách hàng là bắt buộc';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.phone && formData.phone.length > 20) {
      newErrors.phone = 'Số điện thoại không được vượt quá 20 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'loyalty_points' ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <div className="customer-card">
      <div className="customer-card-header">
        <h5 className="customer-card-title">
          {customer ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới'}
        </h5>
      </div>
      <div className="customer-card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Tên khách hàng <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">Số điện thoại</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.phone && <div className="error-message">{errors.phone}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="address" className="form-label">Địa chỉ</label>
            <textarea
              className="form-input"
              id="address"
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {customer && (
            <div className="form-group">
              <label htmlFor="loyalty_points" className="form-label">Điểm tích lũy</label>
              <input
                type="number"
                className="form-input"
                id="loyalty_points"
                name="loyalty_points"
                min="0"
                value={formData.loyalty_points}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          )}

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
                  <span className="spinner"></span>
                  Đang xử lý...
                </>
              ) : (
                customer ? 'Cập nhật' : 'Thêm mới'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Customer Details Component
interface CustomerDetailsProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
  loading?: boolean;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ 
  customer, 
  onClose, 
  onEdit,
  loading = false 
}) => {
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

  return (
    <div className="customer-card">
      <div className="customer-card-header">
        <h5 className="customer-card-title">Chi tiết khách hàng</h5>
        <button 
          type="button" 
          className="close-btn" 
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
      </div>
      <div className="customer-card-body">
        <div className="detail-row">
          <div className="detail-label">ID:</div>
          <div className="detail-value">{customer.customer_id}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Tên:</div>
          <div className="detail-value">{customer.name}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Số điện thoại:</div>
          <div className="detail-value">{customer.phone || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Email:</div>
          <div className="detail-value">{customer.email || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Địa chỉ:</div>
          <div className="detail-value">{customer.address || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Điểm tích lũy:</div>
          <div className="detail-value">
            <span className="loyalty-badge large">{customer.loyalty_points}</span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Ngày tạo:</div>
          <div className="detail-value">{formatDate(customer.created_at)}</div>
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
            onClick={onEdit}
            disabled={loading}
          >
            Sửa thông tin
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Customer Management Component
const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadCustomers();
  }, [pagination.page, pagination.limit]);

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

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await customerService.getAllCustomers(
        pagination.page,
        pagination.limit,
        searchTerm
      );
      setCustomers(response.customers);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng';
      showMessage(errorMessage, 'error');
      console.error('Error loading customers:', err);
      
      // Fallback để tránh crash
      setCustomers([]);
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
    loadCustomers();
  };

  const handleCreateCustomer = async (formData: CustomerFormData) => {
    setFormLoading(true);
    try {
      await customerService.createCustomer(formData);
      setShowForm(false);
      showMessage('Thêm khách hàng thành công!', 'success');
      loadCustomers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi tạo khách hàng';
      showMessage(errorMessage, 'error');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCustomer = async (formData: CustomerFormData) => {
    if (!editingCustomer) return;

    setFormLoading(true);
    try {
      await customerService.updateCustomer(editingCustomer.customer_id, formData);
      setEditingCustomer(null);
      showMessage('Cập nhật khách hàng thành công!', 'success');
      loadCustomers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi cập nhật khách hàng';
      showMessage(errorMessage, 'error');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await customerService.deleteCustomer(customer.customer_id);
      showMessage('Xóa khách hàng thành công!', 'success');
      loadCustomers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể xóa khách hàng';
      showMessage(errorMessage, 'error');
      console.error('Error deleting customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(false);
    setSelectedCustomer(null);
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const resetView = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setSelectedCustomer(null);
    setError('');
  };

  return (
    <div className="customer-management">
      <div className="customer-header">
        <h1>Quản Lý Khách Hàng</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetView();
            setShowForm(true);
          }}
          disabled={loading}
        >
          ➕ Thêm Khách Hàng
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

      {success && (
        <div className="success-alert">
          <div className="alert-content">
            <span className="alert-icon">✅</span>
            {success}
          </div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccess('')}
          >×</button>
        </div>
      )}

      <div className="search-section">
        <form onSubmit={handleSearch}>
          <div className="search-group">
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm theo tên, số điện thoại, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            <button 
              className="search-btn" 
              type="submit"
              disabled={loading}
            >
              {loading ? <div className="spinner-small"></div> : '🔍'}
            </button>
            {searchTerm && (
              <button
                className="clear-btn"
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                  loadCustomers();
                }}
                disabled={loading}
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="customer-content">
        <div className={showForm || editingCustomer || selectedCustomer ? 'main-content' : 'full-content'}>
          <CustomerList
            customers={customers}
            pagination={pagination}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onViewDetails={handleViewDetails}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>

        {(showForm || editingCustomer || selectedCustomer) && (
          <div className="sidebar-content">
            {showForm && (
              <CustomerForm
                onSubmit={handleCreateCustomer}
                onCancel={() => setShowForm(false)}
                loading={formLoading}
              />
            )}

            {editingCustomer && (
              <CustomerForm
                customer={editingCustomer}
                onSubmit={handleUpdateCustomer}
                onCancel={() => setEditingCustomer(null)}
                loading={formLoading}
              />
            )}

            {selectedCustomer && (
              <CustomerDetails
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                onEdit={() => {
                  setEditingCustomer(selectedCustomer);
                  setSelectedCustomer(null);
                }}
                loading={loading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;