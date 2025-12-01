const { parse } = require('dotenv');
const { pool } = require('../config/database');

class Customer {
// Lấy tất cả khách hàng
  static async findAll({ page = 1, limit = 10, search = '' }) {
      try {
          const pageNum = parseInt(page) || 1;
          const limitNum = parseInt(limit) || 10;
          const offset = (pageNum - 1) * limitNum;

          let query = `
              SELECT customer_id, name, birth_year, phone, email, address, loyalty_points, created_at
              FROM customers
              WHERE 1=1
          `;

          const params = [];

          if (search && search.trim() !== '') {
              query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
              params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }

          query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

          console.log('🔍 Customer Query:', query);
          console.log('📊 Customer Params:', params);

          const [rows] = await pool.execute(query, params);

          // Count query
          let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
          const countParams = [];

          if (search && search.trim() !== '') {
              countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
              countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }

          const [countRows] = await pool.execute(countQuery, countParams);
          const total = countRows[0].total;

          return {
              customers: rows,
              pagination: {
                  page: pageNum,
                  limit: limitNum,
                  total,
                  totalPages: Math.ceil(total / limitNum)
              }
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
      name, birth_year, phone, email, address, loyalty_points = 0
    } = customerData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO customers 
         (name, birth_year, phone, email, address, loyalty_points) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, birth_year, phone, email, address, loyalty_points]
      );

      return result.insertId;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật khách hàng
  static async update(customerId, updateData) {
    try {
      const allowedFields = ['name', 'birth_year', 'phone', 'email', 'address', 'loyalty_points'];
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
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      
      // lấy danh sách đơn hàng với phân trang
      const [orders] = await pool.query(
      `SELECT 
        o.order_id,
        o.customer_id,
        o.created_by,
        o.final_amount,
        o.payment_status,
        o.order_status,
        o.created_at
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [customerId]
    );
    // nếu không có đơn hàng nào
    if (orders.length === 0){
      return {
        orders: [],
        pagination : {
          page: parseInt(page),
          limit: limitNum,
          total: 0,
          totalPages: 0
        }
      };
    }
    // lấy danh sách order_id
    const orderIds = orders.map(o => o.order_id);

    const placeholders = orderIds.map(() => '?').join(',');

    
    // lấy chi tiết sản phẩm
    const [orderItems] = await pool.query(
      `SELECT
        oi.order_item_id,
        oi.order_id,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        p.name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id IN (${placeholders})`,
    orderIds, 
    );
    //gắn Item vào từng order
    const ordersWithItems = orders.map(order => {
      const items = orderItems.filter(item => item.order_id === order.order_id);
      return {
        ...order,
        items: items
      };
    });


      // Đếm tổng số đơn hàng
      const [countRows] = await pool.query(
        'SELECT COUNT(*) as total FROM orders WHERE customer_id = ?',
        [customerId]
      );
      const total = countRows[0]?.total || 0;

      return {
        orders: ordersWithItems,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
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