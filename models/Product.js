const { pool } = require('../config/database');

class Product {
  // Lấy tất cả sản phẩm - ĐÃ SỬA TÊN BẢNG
  static async findAll({ page = 1, limit = 10, search = '', category_id, status }) {
  try {
    console.log('=== START FINDALL ===');
    
    // QUERY CỰC KỲ ĐƠN GIẢN - KHÔNG ĐIỀU KIỆN, KHÔNG PARAMS
    const query = "SELECT product_id, name, price FROM products LIMIT 5";
    console.log('Final Query:', query);

    // THỬ CẢ 2 CÁCH
    const [rows] = await pool.execute(query); // Cách 1: không params
    
    console.log('Rows found:', rows);
    console.log('=== END FINDALL ===');

    return {
      products: rows,
      pagination: {
        page: 1,
        limit: 5,
        total: rows.length,
        totalPages: 1
      }
    };
  } catch (error) {
    console.error('=== FINDALL ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error sqlState:', error.sqlState);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR ===');
    throw new Error(`Database error: ${error.message}`);
  }
}

  // Lấy sản phẩm bằng ID - ĐÃ SỬA
  static async findById(productId) {
    try {
      const [rows] = await pool.execute(
        `SELECT p.*, c.name as category_name, s.name as supplier_name 
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.category_id
         LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
         WHERE p.product_id = ?`,
        [productId]
      );
      return rows[0];
    } catch (error) {
      console.error('Get product by ID error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo sản phẩm mới - ĐÃ SỬA
  static async create(productData) {
    const {
      name, sku, description, category_id, supplier_id, price, cost_price,
      stock_quantity, min_stock, max_stock, status = 'active'
    } = productData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO products 
         (name, sku, description, category_id, supplier_id, price, cost_price, stock_quantity, min_stock, max_stock, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, sku, description, category_id, supplier_id, price, cost_price, stock_quantity, min_stock, max_stock, status]
      );

      return result.insertId;
    } catch (error) {
      console.error('Create product error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật sản phẩm - ĐÃ SỬA
  static async update(productId, updateData) {
    try {
      const allowedFields = [
        'name', 'sku', 'description', 'category_id', 'supplier_id', 'price', 
        'cost_price', 'stock_quantity', 'min_stock', 'max_stock', 'status'
      ];
      const updateFields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(productId);

      const [result] = await pool.execute(
        `UPDATE products SET ${updateFields.join(', ')} WHERE product_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Update product error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Xóa sản phẩm - ĐÃ SỬA
  static async delete(productId) {
    try {
      const [result] = await pool.execute(
        'UPDATE products SET status = "deleted" WHERE product_id = ?',
        [productId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Delete product error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tìm kiếm sản phẩm theo tên - ĐÃ SỬA
  static async search(query, limit = 10) {
    try {
      const [rows] = await pool.execute(
        `SELECT product_id, name, sku, price, stock_quantity 
         FROM products 
         WHERE (name LIKE ? OR sku LIKE ?) AND status = 'active'
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, parseInt(limit)]
      );
      return rows;
    } catch (error) {
      console.error('Search products error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật số lượng tồn kho - ĐÃ SỬA
  static async updateStock(productId, newQuantity) {
    try {
      const [result] = await pool.execute(
        'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
        [newQuantity, productId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Update stock error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy sản phẩm sắp hết hàng - ĐÃ SỬA
  static async getLowStock() {
    try {
      const [rows] = await pool.execute(
        `SELECT p.*, c.name as category_name, s.name as supplier_name   
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.category_id
         LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
         WHERE p.stock_quantity <= p.min_stock AND p.status = 'active'
         ORDER BY p.stock_quantity ASC`
      );
      return rows;
    } catch (error) {
      console.error('Get low stock error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Product;