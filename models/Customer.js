const { pool } = require('../config/database');

class Customer {
  // Tt tát cả khách hàng
  static async findAll({ page = 1, limit = 10, search = '' }) {
  try {
    console.log('=== CUSTOMER FINDALL START ===');
    const offset = (page - 1) * limit;
    
    // Query đơn giản test
    const query = "SELECT customer_id, name FROM customers LIMIT 3";
    console.log('Query:', query);
    
    const [rows] = await pool.execute(query);
    console.log('Results:', rows);
    
    return {
      customers: rows,
      pagination: { page: 1, limit: 3, total: rows.length, totalPages: 1 }
    };
  } catch (error) {
    console.error('CUSTOMER FINDALL ERROR:', error.message);
    throw error;
  }
}

  // Tt khách hàng bằng ID
  static async findById(customerId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM customers WHERE customer_id = ?',
        [customerId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tìm khách hàng bằng số điện thoại
  static async findByPhone(phone) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM customers WHERE phone = ?',
        [phone]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo khách hàng mới
  static async create(customerData) {
    const {
      name, phone, email, address, loyalty_points = 0
    } = customerData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO customers 
         (name, phone, email, address, loyalty_points) 
         VALUES (?, ?, ?, ?, ?)`,
        [name, phone, email, address, loyalty_points]
      );

      return result.insertId;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật khách hàng
  static async update(customerId, updateData) {
    try {
      const allowedFields = ['name', 'phone', 'email', 'address', 'loyalty_points'];
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

      values.push(customerId);

      const [result] = await pool.execute(
        `UPDATE customers SET ${updateFields.join(', ')} WHERE customer_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Xóa khách hàng
  static async delete(customerId) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM customers WHERE customer_id = ?',
        [customerId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tìm kiếm khách hàng
  static async search(query, limit = 10) {
    try {
      const [rows] = await pool.execute(
        `SELECT customer_id, name, phone, email, loyalty_points 
         FROM customers 
         WHERE name LIKE ? OR phone LIKE ?
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, parseInt(limit)]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật điểm tích lũy
  static async updateLoyaltyPoints(customerId, points) {
    try {
      const [result] = await pool.execute(
        'UPDATE customers SET loyalty_points = ? WHERE customer_id = ?',
        [points, customerId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lịch sử mua hàng của khách hàng
  static async getPurchaseHistory(customerId, { page = 1, limit = 10 } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const [rows] = await pool.execute(
      `SELECT * FROM orders 
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [customerId, parseInt(limit), offset]
    );

      // Đếm tổng số bản ghi
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM orders WHERE customer_id = ?',
        [customerId]
      );
      const total = countRows[0].total;

      return {
        orders: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get purchase history error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tk mua hàng của khách hàng
  static async getPurchaseStats(customerId) {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          COUNT(*) as total_orders,
          MAX(created_at) as last_purchase_date,
         FROM orders 
         WHERE customer_id = ?`,
        [customerId]
      );
      return rows[0];
    } catch (error) {
      console.error('Get purchase stats error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Customer;