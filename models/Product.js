const { pool } = require('../config/database');

class Product {
  // Lấy tất cả sản phẩm
  static async findAll({ page = 1, limit = 10, search = '', category_id, status }) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      let query = `
              SELECT
                  p.product_id, p.name, p.sku, p.description, p.price, p.cost_price,
                  p.stock_quantity, p.min_stock, p.max_stock, p.status, p.created_at,
                  c.name as category_name, s.name as supplier_name
              FROM products p
              LEFT JOIN categories c ON p.category_id = c.category_id
              LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
              WHERE p.status != 'deleted'
          `;

      const params = [];

      if (search && search.trim() !== '') {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category_id && !isNaN(category_id)) {
        query += ' AND p.category_id = ?';
        params.push(parseInt(category_id));
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC';

      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      console.log('🔍 Final Query:', query);
      console.log('📊 Parameters:', params);

      const [rows] = await pool.execute(query, params);

      // Count
      let countQuery = `
              SELECT COUNT(*) as total
              FROM products p
              LEFT JOIN categories c ON p.category_id = c.category_id
              LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
              WHERE p.status != 'deleted'
          `;

      const countParams = [];

      if (search && search.trim() !== '') {
        countQuery += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (category_id && !isNaN(category_id)) {
        countQuery += ' AND p.category_id = ?';
        countParams.push(parseInt(category_id));
      }

      if (status) {
        countQuery += ' AND p.status = ?';
        countParams.push(status);
      }

      const [countRows] = await pool.execute(countQuery, countParams);
      const total = countRows[0].total;

      return {
        products: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

    } catch (error) {
      console.error('PRODUCT FINDALL ERROR:', error.message);
      throw error;
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
      const limitNum = parseInt(limit) || 10;
      
      // Sử dụng query() thay vì execute()
      const [rows] = await pool.query(
        `SELECT product_id, name, sku, price, stock_quantity
        FROM products
        WHERE (name LIKE ? OR sku LIKE ?) AND status = 'active'
        LIMIT ?`,
        [`%${query}%`, `%${query}%`, limitNum]
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