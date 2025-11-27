// ProductManagement.tsx
import React, { useState, useEffect } from 'react';
import './product.css';
// Types
interface Product {
  product_id: number;
  name: string;
  sku?: string;
  description?: string;
  category_id: number;
  supplier_id: number;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock: number;
  max_stock: number;
  status: string;
  created_at: string;
  category_name?: string;
  supplier_name?: string;
}

interface ProductFormData {
  name: string;
  sku?: string;
  description?: string;
  category_id?: number;
  supplier_id?: number;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock?: number;
  max_stock?: number;
  status?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Product Service
class ProductService {
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

  async getAllProducts(page: number = 1, limit: number = 10, search: string = '', category_id?: string, status?: string): Promise<{ products: Product[], pagination: PaginationInfo }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(category_id && { category_id }),
      ...(status && { status })
    });

    const response = await fetch(`${this.baseURL}/products?${params}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: Product[], pagination: PaginationInfo }>(response);
    
    return {
      products: result.data || [],
      pagination: result.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    };
  }

  async getProductById(id: number): Promise<Product> {
    const response = await fetch(`${this.baseURL}/products/${id}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { product: Product } }>(response);
    return result.data.product;
  }

  async createProduct(productData: ProductFormData): Promise<number> {
    const response = await fetch(`${this.baseURL}/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    const result = await this.handleResponse<{ data: { product_id: number } }>(response);
    return result.data.product_id;
  }

  async updateProduct(id: number, productData: Partial<ProductFormData>): Promise<void> {
    const response = await fetch(`${this.baseURL}/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    await this.handleResponse(response);
  }

  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    const response = await fetch(`${this.baseURL}/products/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { products: Product[] } }>(response);
    return result.data.products;
  }

  async getLowStockProducts(): Promise<Product[]> {
    const response = await fetch(`${this.baseURL}/products/low-stock`, {
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<{ data: { products: Product[] } }>(response);
    return result.data.products;
  }
}

const productService = new ProductService();

// Product List Component
interface ProductListProps {
  products: Product[];
  pagination: PaginationInfo;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  pagination,
  onEdit,
  onDelete,
  onViewDetails,
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

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { text: 'Hết hàng', class: 'out-of-stock' };
    if (quantity <= minStock) return { text: 'Sắp hết', class: 'low-stock' };
    return { text: 'Còn hàng', class: 'in-stock' };
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

  if (loading && products.length === 0) {
    return (
      <div className="product-card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-card">
      <div className="product-card-header">
        <h5 className="product-card-title">Danh sách sản phẩm</h5>
        <div className="product-count">
          Tổng: {pagination?.total || 0} sản phẩm
        </div>
      </div>
      <div className="product-card-body">
        <div className="table-responsive">
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên sản phẩm</th>
                <th>SKU</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stockStatus = getStockStatus(product.stock_quantity, product.min_stock);
                return (
                  <tr key={product.product_id}>
                    <td>{product.product_id}</td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      {product.description && (
                        <div className="product-description">{product.description}</div>
                      )}
                    </td>
                    <td>{product.sku || '-'}</td>
                    <td>{product.category_name || '-'}</td>
                    <td className="price">{formatCurrency(product.price)}</td>
                    <td>
                      <div className="stock-info">
                        <span className="stock-quantity">{product.stock_quantity}</span>
                        <span className={`stock-status ${stockStatus.class}`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${product.status}`}>
                        {product.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td>{formatDate(product.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-info"
                          onClick={() => onViewDetails(product)}
                          title="Xem chi tiết"
                          disabled={loading}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-warning"
                          onClick={() => onEdit(product)}
                          title="Sửa"
                          disabled={loading}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => onDelete(product)}
                          title="Xóa"
                          disabled={loading}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && !loading && (
          <div className="empty-state">
            <p className="empty-text">Không có sản phẩm nào</p>
          </div>
        )}

        {renderPagination()}
      </div>
    </div>
  );
};

// Product Form Component
interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    description: '',
    category_id: undefined,
    supplier_id: undefined,
    price: 0,
    cost_price: 0,
    stock_quantity: 0,
    min_stock: 0,
    max_stock: 100,
    status: 'active'

  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id,
        supplier_id: product.supplier_id,
        price: product.price,
        cost_price: product.cost_price,
        stock_quantity: product.stock_quantity,
        min_stock: product.min_stock,
        max_stock: product.max_stock,
        status: product.status
      });
    }
  }, [product]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên sản phẩm là bắt buộc';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Danh mục là bắt buộc';
    }

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Nhà cung cấp là bắt buộc';
    }

    if (!formData.price || formData.price < 0) {
      newErrors.price = 'Giá sản phẩm phải là số dương';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name.includes('quantity') || name.includes('stock') || name.includes('_id') 
        ? (value === '' ? undefined : Number(value))
        : value
    }));
  };

  return (
    <div className="product-card">
      <div className="product-card-header">
        <h5 className="product-card-title">
          {product ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'}
        </h5>
      </div>
      <div className="product-card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Tên sản phẩm <span className="required">*</span>
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
              <label htmlFor="sku" className="form-label">SKU</label>
              <input
                type="text"
                className="form-input"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">Mô tả</label>
            <textarea
              className="form-input"
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category_id" className="form-label">
                Danh mục <span className="required">*</span>
              </label>
              <input
                type="number"
                className={`form-input ${errors.category_id ? 'error' : ''}`}
                id="category_id"
                name="category_id"
                value={formData.category_id || ''}
                onChange={handleChange}
                required
                disabled={loading}
              />
              {errors.category_id && <div className="error-message">{errors.category_id}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="supplier_id" className="form-label">
                Nhà cung cấp <span className="required">*</span>
              </label>
              <input
                type="number"
                className={`form-input ${errors.supplier_id ? 'error' : ''}`}
                id="supplier_id"
                name="supplier_id"
                value={formData.supplier_id || ''}
                onChange={handleChange}
                required
                disabled={loading}
              />
              {errors.supplier_id && <div className="error-message">{errors.supplier_id}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price" className="form-label">
                Giá bán <span className="required">*</span>
              </label>
              <input
                type="number"
                className={`form-input ${errors.price ? 'error' : ''}`}
                id="price"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                disabled={loading}
              />
              {errors.price && <div className="error-message">{errors.price}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="cost_price" className="form-label">Giá vốn</label>
              <input
                type="number"
                className="form-input"
                id="cost_price"
                name="cost_price"
                min="0"
                step="0.01"
                value={formData.cost_price || ''}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stock_quantity" className="form-label">Số lượng tồn</label>
              <input
                type="number"
                className="form-input"
                id="stock_quantity"
                name="stock_quantity"
                min="0"
                value={formData.stock_quantity || ''}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="min_stock" className="form-label">Tồn kho tối thiểu</label>
              <input
                type="number"
                className="form-input"
                id="min_stock"
                name="min_stock"
                min="0"
                value={formData.min_stock || ''}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="max_stock" className="form-label">Tồn kho tối đa</label>
              <input
                type="number"
                className="form-input"
                id="max_stock"
                name="max_stock"
                min="0"
                value={formData.max_stock || ''}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status" className="form-label">Trạng thái</label>
            <select
              className="form-input"
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="active">Hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
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
                  <span className="spinner"></span>
                  Đang xử lý...
                </>
              ) : (
                product ? 'Cập nhật' : 'Thêm mới'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Product Details Component
interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  loading?: boolean;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ 
  product, 
  onClose, 
  onEdit,
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

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { text: 'Hết hàng', class: 'out-of-stock' };
    if (quantity <= minStock) return { text: 'Sắp hết', class: 'low-stock' };
    return { text: 'Còn hàng', class: 'in-stock' };
  };

  const stockStatus = getStockStatus(product.stock_quantity, product.min_stock);

  return (
    <div className="product-card">
      <div className="product-card-header">
        <h5 className="product-card-title">Chi tiết sản phẩm</h5>
        <button 
          type="button" 
          className="close-btn" 
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
      </div>
      <div className="product-card-body">
        <div className="detail-row">
          <div className="detail-label">ID:</div>
          <div className="detail-value">{product.product_id}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Tên sản phẩm:</div>
          <div className="detail-value">{product.name}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">SKU:</div>
          <div className="detail-value">{product.sku || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Mô tả:</div>
          <div className="detail-value">{product.description || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Danh mục:</div>
          <div className="detail-value">{product.category_name || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Nhà cung cấp:</div>
          <div className="detail-value">{product.supplier_name || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Giá bán:</div>
          <div className="detail-value price">{formatCurrency(product.price)}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Giá vốn:</div>
          <div className="detail-value">{formatCurrency(product.cost_price)}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Tồn kho:</div>
          <div className="detail-value">
            <div className="stock-info">
              <span className="stock-quantity">{product.stock_quantity}</span>
              <span className={`stock-status ${stockStatus.class}`}>
                {stockStatus.text}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Tồn kho tối thiểu:</div>
          <div className="detail-value">{product.min_stock}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Tồn kho tối đa:</div>
          <div className="detail-value">{product.max_stock}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Trạng thái:</div>
          <div className="detail-value">
            <span className={`status-badge ${product.status}`}>
              {product.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Ngày tạo:</div>
          <div className="detail-value">{formatDate(product.created_at)}</div>
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

// Main Product Management Component
const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, [pagination.page, pagination.limit, categoryFilter, statusFilter]);

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

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productService.getAllProducts(
        pagination.page,
        pagination.limit,
        searchTerm,
        categoryFilter,
        statusFilter
      );
      setProducts(response.products);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm';
      showMessage(errorMessage, 'error');
      console.error('Error loading products:', err);
      
      // Fallback để tránh crash
      setProducts([]);
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
    loadProducts();
  };

  const handleCreateProduct = async (formData: ProductFormData) => {
    setFormLoading(true);
    try {
      await productService.createProduct(formData);
      setShowForm(false);
      showMessage('Thêm sản phẩm thành công!', 'success');
      loadProducts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi tạo sản phẩm';
      showMessage(errorMessage, 'error');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProduct = async (formData: ProductFormData) => {
    if (!editingProduct) return;

    setFormLoading(true);
    try {
      await productService.updateProduct(editingProduct.product_id, formData);
      setEditingProduct(null);
      showMessage('Cập nhật sản phẩm thành công!', 'success');
      loadProducts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi cập nhật sản phẩm';
      showMessage(errorMessage, 'error');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await productService.deleteProduct(product.product_id);
      showMessage('Xóa sản phẩm thành công!', 'success');
      loadProducts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể xóa sản phẩm';
      showMessage(errorMessage, 'error');
      console.error('Error deleting product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(false);
    setSelectedProduct(null);
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowForm(false);
    setEditingProduct(null);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const resetView = () => {
    setShowForm(false);
    setEditingProduct(null);
    setSelectedProduct(null);
    setError('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStatusFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
    loadProducts();
  };

  return (
    <div className="product-management">
      <div className="product-header">
        <h1>Quản Lý Sản Phẩm</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetView();
            setShowForm(true);
          }}
          disabled={loading}
        >
          ➕ Thêm Sản Phẩm
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

      <div className="filters-section">
        <form onSubmit={handleSearch}>
          <div className="filters-row">
            <div className="search-group">
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm theo tên, SKU..."
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
            </div>

            <div className="filter-group">
              <select
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={loading}
              >
                <option value="">Tất cả danh mục</option>
                {/* Categories sẽ được load từ API */}
              </select>
            </div>

            <div className="filter-group">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={clearFilters}
              disabled={loading}
            >
              Xóa bộ lọc
            </button>
          </div>
        </form>
      </div>

      <div className="product-content">
        <div className={showForm || editingProduct || selectedProduct ? 'main-content' : 'full-content'}>
          <ProductList
            products={products}
            pagination={pagination}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onViewDetails={handleViewDetails}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>

        {(showForm || editingProduct || selectedProduct) && (
          <div className="sidebar-content">
            {showForm && (
              <ProductForm
                onSubmit={handleCreateProduct}
                onCancel={() => setShowForm(false)}
                loading={formLoading}
              />
            )}

            {editingProduct && (
              <ProductForm
                product={editingProduct}
                onSubmit={handleUpdateProduct}
                onCancel={() => setEditingProduct(null)}
                loading={formLoading}
              />
            )}

            {selectedProduct && (
              <ProductDetails
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onEdit={() => {
                  setEditingProduct(selectedProduct);
                  setSelectedProduct(null);
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

export default ProductManagement;