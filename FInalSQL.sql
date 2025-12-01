-- =============================================
-- STORE MANAGEMENT SYSTEM - HOÀN CHỈNH
-- =============================================

DROP DATABASE IF EXISTS store_management;
CREATE DATABASE store_management;
USE store_management;

-- =============================================
-- I. PHÂN QUYỀN VÀ ĐĂNG NHẬP
-- =============================================

-- 1. Bảng USERS
CREATE TABLE USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng SESSIONS
CREATE TABLE SESSIONS (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 3. Bảng ROLE_PERMISSION
CREATE TABLE ROLE_PERMISSION (
    role_permission_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL
);

-- =============================================
-- II. QUẢN LÝ KHÁCH HÀNG
-- =============================================

-- 4. Bảng CUSTOMERS
CREATE TABLE CUSTOMERS (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    birth_year INT,  -- ✅ THÊM CỘT NÀY
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100),
    address TEXT,
    loyalty_points INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- III. QUẢN LÝ DANH MỤC (SẢN PHẨM VÀ NHÀ CUNG CẤP)
-- =============================================

-- 5. Bảng CATEGORIES
CREATE TABLE CATEGORIES (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES CATEGORIES(category_id) ON DELETE SET NULL
);

-- 6. Bảng SUPPLIERS
CREATE TABLE SUPPLIERS (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng PRODUCTS
CREATE TABLE PRODUCTS (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    description TEXT,
    category_id INT NOT NULL,
    supplier_id INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) DEFAULT 0.00,
    stock_quantity INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    max_stock INT DEFAULT 100000,
    status ENUM('active','inactive','deleted') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id),
    FOREIGN KEY (supplier_id) REFERENCES SUPPLIERS(supplier_id)
);

-- 8. Bảng INVENTORY_TRANSACTIONS
CREATE TABLE INVENTORY_TRANSACTIONS (
    inventory_transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('import','export','adjust') NOT NULL,
    quantity INT NOT NULL,
    reference_type ENUM('order', 'stock_in', 'adjustment') NOT NULL,
    reference_id INT NOT NULL,
    note TEXT,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id),
    FOREIGN KEY (created_by) REFERENCES USERS(user_id)
);

-- =============================================
-- IV. QUẢN LÝ ĐƠN HÀNG (ĐÃ BỎ CÁC CỘT THUẾ)
-- =============================================

-- 9. Bảng ORDERS (ĐÃ BỎ TAX, SUBTOTAL, DISCOUNT)
CREATE TABLE ORDERS (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    created_by INT NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL,
    payment_status ENUM('pending','paid','refunded') DEFAULT 'pending',
    order_status ENUM('draft','confirmed','completed','cancelled') DEFAULT 'draft',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES CUSTOMERS(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id)
);

-- 10. Bảng ORDER_ITEMS
CREATE TABLE ORDER_ITEMS (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
);

-- =============================================
-- V. QUẢN LÝ KHO HÀNG
-- =============================================

-- 11. Bảng STOCK_IN_ORDERS
CREATE TABLE STOCK_IN_ORDERS (
    stock_in_order_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    created_by INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('draft','confirmed','cancelled') DEFAULT 'draft',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES SUPPLIERS(supplier_id),
    FOREIGN KEY (created_by) REFERENCES USERS(user_id)
);

-- 12. Bảng STOCK_IN_ITEMS
CREATE TABLE STOCK_IN_ITEMS (
    stock_in_item_id INT AUTO_INCREMENT PRIMARY KEY,
    stock_in_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (stock_in_order_id) REFERENCES STOCK_IN_ORDERS(stock_in_order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
);

-- =============================================
-- VI. BÁO CÁO VÀ THỐNG KÊ
-- =============================================

-- 13. Bảng REPORTS
CREATE TABLE REPORTS (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    report_type ENUM('sales','inventory','customer') NOT NULL,
    data JSON NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id)
);

-- =============================================
-- TẠO INDEX CHO HIỆU NĂNG
-- =============================================

-- Index cho bảng USERS
CREATE INDEX idx_users_username ON USERS(username);
CREATE INDEX idx_users_role ON USERS(role);

-- Index cho bảng PRODUCTS
CREATE INDEX idx_products_category ON PRODUCTS(category_id);
CREATE INDEX idx_products_supplier ON PRODUCTS(supplier_id);
CREATE INDEX idx_products_status ON PRODUCTS(status);
CREATE INDEX idx_products_sku ON PRODUCTS(sku);

-- Index cho bảng ORDERS
CREATE INDEX idx_orders_customer ON ORDERS(customer_id);
CREATE INDEX idx_orders_created_by ON ORDERS(created_by);
CREATE INDEX idx_orders_status ON ORDERS(order_status);
CREATE INDEX idx_orders_payment_status ON ORDERS(payment_status);
CREATE INDEX idx_orders_created_at ON ORDERS(created_at);

-- Index cho bảng ORDER_ITEMS
CREATE INDEX idx_order_items_order ON ORDER_ITEMS(order_id);
CREATE INDEX idx_order_items_product ON ORDER_ITEMS(product_id);

-- Index cho bảng CUSTOMERS
CREATE INDEX idx_customers_phone ON CUSTOMERS(phone);

-- Index cho bảng INVENTORY_TRANSACTIONS
CREATE INDEX idx_inventory_product ON INVENTORY_TRANSACTIONS(product_id);
CREATE INDEX idx_inventory_created_at ON INVENTORY_TRANSACTIONS(created_at);
CREATE INDEX idx_inventory_reference ON INVENTORY_TRANSACTIONS(reference_type, reference_id);

-- Index cho bảng STOCK_IN_ORDERS
CREATE INDEX idx_stock_in_supplier ON STOCK_IN_ORDERS(supplier_id);
CREATE INDEX idx_stock_in_created_by ON STOCK_IN_ORDERS(created_by);

-- Index cho bảng STOCK_IN_ITEMS
CREATE INDEX idx_stock_items_stock_in ON STOCK_IN_ITEMS(stock_in_order_id);
CREATE INDEX idx_stock_items_product ON STOCK_IN_ITEMS(product_id);

-- =============================================
-- CHÈN DỮ LIỆU MẪU
-- =============================================

-- Chèn dữ liệu cho USERS
INSERT INTO USERS (username, password_hash, role, full_name, email, phone, is_active) VALUES
('manager', '$2b$10$ExampleHashForManager', 'manager', 'System Manager', 'manager@example.com', '0123456789', 'active'),
('staff1', '$2b$10$ExampleHashForStaff1', 'staff', NULL, NULL, NULL, 'active'),
('staff2', '$2b$10$ExampleHashForStaff2', 'staff', NULL, NULL, NULL, 'active');

-- Chèn dữ liệu cho ROLE_PERMISSION
INSERT INTO ROLE_PERMISSION (role_name, permission, resource) VALUES
('manager', 'create', 'products'),
('manager', 'update', 'products'),
('manager', 'delete', 'products'),
('manager', 'read', 'reports'),
('staff', 'create', 'orders'),
('staff', 'read', 'products'),
('staff', 'update', 'orders');

-- Chèn dữ liệu cho CATEGORIES
INSERT INTO CATEGORIES (name, description) VALUES
('Điện tử', 'Thiết bị điện tử công nghệ'),
('Điện lạnh', 'Thiết bị điện lạnh gia dụng'),
('Gia dụng', 'Đồ dùng gia đình');

-- Chèn dữ liệu cho SUPPLIERS
INSERT INTO SUPPLIERS (name, contact_person, phone, email, address, rating) VALUES
('Công ty ABC Electronics', 'Nguyễn Văn A', '0987654321', 'contact@abc.com', '123 Nguyễn Trãi, Q.1, TP.HCM', 4.5),
('Công ty XYZ Home', 'Trần Thị B', '0912345678', 'info@xyz.com', '456 Lê Lợi, Q.3, TP.HCM', 4.2);

-- Chèn dữ liệu cho PRODUCTS
INSERT INTO PRODUCTS (name, sku, description, category_id, supplier_id, price, cost_price, stock_quantity) VALUES
('iPhone 13 128GB', 'IP13-128', 'Điện thoại iPhone 13 128GB', 1, 1, 21990000, 18000000, 25),
('Samsung Galaxy A52', 'SGA52-128', 'Samsung Galaxy A52 8GB/128GB', 1, 1, 7990000, 6500000, 30),
('Tủ lạnh Samsung 123 lít', 'TLS-123', 'Tủ lạnh Samsung Inverter 123 lít', 2, 2, 5990000, 4500000, 15);

-- Chèn dữ liệu cho CUSTOMERS
INSERT INTO CUSTOMERS (name, birth_year, phone, email, address, loyalty_points) VALUES
('Nguyễn Văn An', 1990, '0909123456', 'nguyen.an@email.com', '123 Lý Thường Kiệt, Q.10, TP.HCM', 150),
('Trần Thị Bình', 1995, '0918123456', 'tran.binh@email.com', '456 Nguyễn Du, Q.1, TP.HCM', 75);

-- Chèn dữ liệu cho ORDERS (đã loại bỏ các cột thuế)
INSERT INTO ORDERS (customer_id, created_by, final_amount, payment_status, order_status) VALUES
(1, 2, 21990000, 'paid', 'completed'),
(2, 3, 7490000, 'pending', 'confirmed');

-- Chèn dữ liệu cho ORDER_ITEMS
INSERT INTO ORDER_ITEMS (order_id, product_id, name, quantity, unit_price, total_price) VALUES
(1, 1, 'iPhone 13 128GB', 1, 21990000, 21990000),
(2, 2, 'Samsung Galaxy A52', 1, 7990000, 7990000);

-- Chèn dữ liệu cho STOCK_IN_ORDERS
INSERT INTO STOCK_IN_ORDERS (supplier_id, created_by, total_amount, status) VALUES
(1, 1, 50000000, 'confirmed'),
(2, 1, 30000000, 'draft');

-- Chèn dữ liệu cho STOCK_IN_ITEMS
INSERT INTO STOCK_IN_ITEMS (stock_in_order_id, product_id, quantity, unit_cost, total_price) VALUES
(1, 1, 10, 18000000, 180000000),
(1, 2, 15, 6500000, 97500000);

-- Chèn dữ liệu cho INVENTORY_TRANSACTIONS
INSERT INTO INVENTORY_TRANSACTIONS (product_id, type, quantity, reference_type, reference_id, note, created_by) VALUES
(1, 'export', 1, 'order', 1, 'Xuất kho cho đơn hàng #1', 2),
(2, 'export', 1, 'order', 2, 'Xuất kho cho đơn hàng #2', 3),
(1, 'import', 10, 'stock_in', 1, 'Nhập kho từ phiếu nhập #1', 1),
(2, 'import', 15, 'stock_in', 1, 'Nhập kho từ phiếu nhập #1', 1),
(1, 'adjust', 5, 'adjustment', 1, 'Điều chỉnh tồn kho sau kiểm kê', 1);
