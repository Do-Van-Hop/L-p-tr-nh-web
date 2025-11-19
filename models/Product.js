const { pool } = require('../config/database');

class Product {
  // Lấy tất cả sản phẩm
  static async findAll({ page = 1, limit = 10, search = '', category_id, status }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT p.*, c.name as category_name, s.name as supplier_name 
        FROM PRODUCTS p
        LEFT JOIN CATEGORIES c ON p.category_id = c.category_id
        LEFT JOIN SUPPLIERS s ON p.supplier_id = s.supplier_id
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [rows] = await pool.execute(query, params);

      // Đếm tổng số bản ghi
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM PRODUCTS p
        WHERE 1=1
      `;
      const countParams = [];

      if (search) {
        countQuery += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (category_id) {
        countQuery += ' AND p.category_id = ?';
        countParams.push(category_id);
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
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy sản phẩm bằng ID
  static async findById(productId) {
    try {
      const [rows] = await pool.execute(
        `SELECT p.*, c.name as category_name, s.name as supplier_name 
         FROM PRODUCTS p
         LEFT JOIN CATEGORIES c ON p.category_id = c.category_id
         LEFT JOIN SUPPLIERS s ON p.supplier_id = s.supplier_id
         WHERE p.product_id = ?`,
        [productId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo sản phẩm mới
  static async create(productData) {
    const {
      name, sku, description, category_id, supplier_id, price, cost_price,
      stock_quantity, min_stock, max_stock, status = 'active'
    } = productData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO PRODUCTS 
         (name, sku, description, category_id, supplier_id, price, cost_price, stock_quantity, min_stock, max_stock, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, sku, description, category_id, supplier_id, price, cost_price, stock_quantity, min_stock, max_stock, status]
      );

      return result.insertId;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật sản phẩm
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
        `UPDATE PRODUCTS SET ${updateFields.join(', ')} WHERE product_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Xóa sản phẩm
  static async delete(productId) {
    try {
      const [result] = await pool.execute(
        'UPDATE PRODUCTS SET status = "deleted" WHERE product_id = ?',
        [productId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tìm kiếm sản phẩm theo tên
  static async search(query, limit = 10) {
    try {
      const [rows] = await pool.execute(
        `SELECT product_id, name, sku, price, stock_quantity 
         FROM PRODUCTS 
         WHERE (name LIKE ? OR sku LIKE ?) AND status = 'active'
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, parseInt(limit)]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật số lượng tồn kho
  static async updateStock(productId, newQuantity) {
    try {
      const [result] = await pool.execute(
        'UPDATE PRODUCTS SET stock_quantity = ? WHERE product_id = ?',
        [newQuantity, productId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy sản phẩm sắp hết hàng (dưới mức tối thiểu)
  static async getLowStock() {
    try {
      const [rows] = await pool.execute(
        `SELECT p.*, c.name as category_name, s.name as supplier_name 
         FROM PRODUCTS p
         LEFT JOIN CATEGORIES c ON p.category_id = c.category_id
         LEFT JOIN SUPPLIERS s ON p.supplier_id = s.supplier_id
         WHERE p.stock_quantity <= p.min_stock AND p.status = 'active'
         ORDER BY p.stock_quantity ASC`
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Product;