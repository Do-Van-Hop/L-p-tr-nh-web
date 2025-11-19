const { pool } = require('../config/database');

class Order {
  // Lấy tất cả đơn hàng
  static async findAll({ page = 1, limit = 10, search = '', status, payment_status, date_from, date_to }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.username as created_by_name
        FROM ORDERS o
        LEFT JOIN CUSTOMERS c ON o.customer_id = c.customer_id
        LEFT JOIN USERS u ON o.created_by = u.user_id
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ' AND (o.order_id = ? OR c.name LIKE ? OR c.phone LIKE ?)';
        const searchId = parseInt(search) || 0;
        params.push(searchId, `%${search}%`, `%${search}%`);
      }

      if (status) {
        query += ' AND o.order_status = ?';
        params.push(status);
      }

      if (payment_status) {
        query += ' AND o.payment_status = ?';
        params.push(payment_status);
      }

      if (date_from) {
        query += ' AND DATE(o.created_at) >= ?';
        params.push(date_from);
      }

      if (date_to) {
        query += ' AND DATE(o.created_at) <= ?';
        params.push(date_to);
      }

      query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [rows] = await pool.execute(query, params);

      // Đếm tổng số bản ghi
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM ORDERS o
        LEFT JOIN CUSTOMERS c ON o.customer_id = c.customer_id
        WHERE 1=1
      `;
      const countParams = [];

      if (search) {
        countQuery += ' AND (o.order_id = ? OR c.name LIKE ? OR c.phone LIKE ?)';
        const searchId = parseInt(search) || 0;
        countParams.push(searchId, `%${search}%`, `%${search}%`);
      }

      if (status) {
        countQuery += ' AND o.order_status = ?';
        countParams.push(status);
      }

      if (payment_status) {
        countQuery += ' AND o.payment_status = ?';
        countParams.push(payment_status);
      }

      if (date_from) {
        countQuery += ' AND DATE(o.created_at) >= ?';
        countParams.push(date_from);
      }

      if (date_to) {
        countQuery += ' AND DATE(o.created_at) <= ?';
        countParams.push(date_to);
      }

      const [countRows] = await pool.execute(countQuery, countParams);
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
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy đơn hàng bằng ID
  static async findById(orderId) {
    try {
      const [rows] = await pool.execute(
        `SELECT o.*, c.name as customer_name, c.phone as customer_phone, 
                c.email as customer_email, c.address as customer_address,
                u.username as created_by_name
         FROM ORDERS o
         LEFT JOIN CUSTOMERS c ON o.customer_id = c.customer_id
         LEFT JOIN USERS u ON o.created_by = u.user_id
         WHERE o.order_id = ?`,
        [orderId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy chi tiết đơn hàng
  static async getOrderItems(orderId) {
    try {
      const [rows] = await pool.execute(
        `SELECT oi.*, p.name as product_name, p.sku as product_sku
         FROM ORDER_ITEMS oi
         JOIN PRODUCTS p ON oi.product_id = p.product_id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo đơn hàng mới
  static async create(orderData, items) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        customer_id, created_by, subtotal, discount, tax, final_amount,
        payment_status = 'pending', order_status = 'draft', note
      } = orderData;

      // Tạo đơn hàng
      const [orderResult] = await connection.execute(
        `INSERT INTO ORDERS 
         (customer_id, created_by, subtotal, discount, tax, final_amount, payment_status, order_status, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, created_by, subtotal, discount, tax, final_amount, payment_status, order_status, note]
      );

      const orderId = orderResult.insertId;

      // Thêm các items vào đơn hàng
      for (const item of items) {
        const { product_id, quantity, unit_price, total_price } = item;
        
        await connection.execute(
          `INSERT INTO ORDER_ITEMS 
           (order_id, product_id, quantity, unit_price, total_price) 
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, product_id, quantity, unit_price, total_price]
        );

        // Cập nhật tồn kho
        await connection.execute(
          'UPDATE PRODUCTS SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
          [quantity, product_id]
        );

        // Ghi log inventory transaction
        await connection.execute(
          `INSERT INTO INVENTORY_TRANSACTIONS 
           (product_id, type, quantity, reference_type, reference_id, note, created_by) 
           VALUES (?, 'export', ?, 'order', ?, 'Xuất kho cho đơn hàng', ?)`,
          [product_id, quantity, orderId, created_by]
        );
      }

      await connection.commit();
      return orderId;

    } catch (error) {
      await connection.rollback();
      throw new Error(`Database error: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Cập nhật trạng thái đơn hàng
  static async updateStatus(orderId, updateData) {
    try {
      const allowedFields = ['order_status', 'payment_status', 'note'];
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

      values.push(orderId);

      const [result] = await pool.execute(
        `UPDATE ORDERS SET ${updateFields.join(', ')} WHERE order_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Hủy đơn hàng
  static async cancel(orderId, userId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Lấy thông tin items để hoàn lại tồn kho
      const [items] = await connection.execute(
        'SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?',
        [orderId]
      );

      // Hoàn lại tồn kho
      for (const item of items) {
        await connection.execute(
          'UPDATE PRODUCTS SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );

        // Ghi log inventory transaction
        await connection.execute(
          `INSERT INTO INVENTORY_TRANSACTIONS 
           (product_id, type, quantity, reference_type, reference_id, note, created_by) 
           VALUES (?, 'import', ?, 'order', ?, 'Hoàn trả tồn kho do hủy đơn hàng', ?)`,
          [item.product_id, item.quantity, orderId, userId]
        );
      }

      // Cập nhật trạng thái đơn hàng
      const [result] = await connection.execute(
        'UPDATE ORDERS SET order_status = "cancelled" WHERE order_id = ?',
        [orderId]
      );

      await connection.commit();
      return result.affectedRows > 0;

    } catch (error) {
      await connection.rollback();
      throw new Error(`Database error: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Lấy đơn hàng theo khách hàng
  static async findByCustomer(customerId, { page = 1, limit = 10 } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const [rows] = await pool.execute(
        `SELECT o.*, u.username as created_by_name
         FROM ORDERS o
         LEFT JOIN USERS u ON o.created_by = u.user_id
         WHERE o.customer_id = ?
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [customerId, parseInt(limit), offset]
      );

      // Đếm tổng số bản ghi
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM ORDERS WHERE customer_id = ?',
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
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Thống kê đơn hàng
  static async getStats(dateFrom, dateTo) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(final_amount) as total_revenue,
          AVG(final_amount) as avg_order_value,
          COUNT(CASE WHEN order_status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
        FROM ORDERS
        WHERE 1=1
      `;
      const params = [];

      if (dateFrom) {
        query += ' AND DATE(created_at) >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ' AND DATE(created_at) <= ?';
        params.push(dateTo);
      }

      const [rows] = await pool.execute(query, params);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Order;