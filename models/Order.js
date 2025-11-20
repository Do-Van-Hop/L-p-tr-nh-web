const { pool } = require('../config/database');

class Order {
  // Lấy tất cả đơn hàng
  static async findAll({ page = 1, limit = 10, search = '', status, payment_status, date_from, date_to }) {
  try {
    console.log('=== ORDER FINDALL START ===');
    const offset = (page - 1) * limit;
    
    // QUERY CỨNG - KHÔNG DÙNG PARAMETERS
    let query = `
      SELECT 
        order_id,
        customer_id,
        subtotal,
        discount,
        tax,
        final_amount,
        payment_status,
        order_status,
        created_at
      FROM orders 
      WHERE 1=1
    `;

    // THÊM ĐIỀU KIỆN CỨNG (nếu có)
    if (search && search.trim() !== '') {
      const searchId = parseInt(search) || 0;
      query += ` AND order_id = ${searchId}`;
    }

    if (status) {
      query += ` AND order_status = '${status}'`;
    }

    if (payment_status) {
      query += ` AND payment_status = '${payment_status}'`;
    }

    if (date_from) {
      query += ` AND DATE(created_at) >= '${date_from}'`;
    }

    if (date_to) {
      query += ` AND DATE(created_at) <= '${date_to}'`;
    }

    // THÊM LIMIT/OFFSET CỨNG
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    console.log('Final HARDCODED Query:', query);

    // THỰC THI KHÔNG TRUYỀN PARAMS
    const [rows] = await pool.execute(query);
    console.log('Rows found:', rows.length);

    // COUNT QUERY CỨNG
    const countQuery = 'SELECT COUNT(*) as total FROM orders';
    const [countRows] = await pool.execute(countQuery);
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
    console.error('ORDER FINDALL ERROR:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error(`Database error: ${error.message}`);
  }
}
  // Lấy đơn hàng bằng ID
  static async findById(orderId) {
    try {
      const [rows] = await pool.execute(
        `SELECT orders.*, customers.name as customer_name, customers.phone as customer_phone, 
                customers.email as customer_email, customers.address as customer_address,
                users.username as created_by_name
         FROM orders 
         LEFT JOIN customers ON orders.customer_id = customers.customer_id
         LEFT JOIN users ON orders.created_by = users.user_id
         WHERE orders.order_id = ?`,
        [orderId]
      );
      return rows[0];
    } catch (error) {
      console.error('Order findById error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy chi tiết đơn hàng
  static async getOrderItems(orderId) {
    try {
      const [rows] = await pool.execute(
        `SELECT order_items.*, products.name as product_name, products.sku as product_sku
         FROM order_items 
         JOIN products ON order_items.product_id = products.product_id
         WHERE order_items.order_id = ?`,
        [orderId]
      );
      return rows;
    } catch (error) {
      console.error('Order getOrderItems error:', error.message);
      return [];
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
        `INSERT INTO orders 
         (customer_id, created_by, subtotal, discount, tax, final_amount, payment_status, order_status, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, created_by, subtotal, discount, tax, final_amount, payment_status, order_status, note]
      );

      const orderId = orderResult.insertId;

      // Thêm các items vào đơn hàng
      for (const item of items) {
        const { product_id, quantity, unit_price, total_price } = item;
        
        await connection.execute(
          `INSERT INTO order_items 
           (order_id, product_id, quantity, unit_price, total_price) 
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, product_id, quantity, unit_price, total_price]
        );

        // Cập nhật tồn kho
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
          [quantity, product_id]
        );

        // Ghi log inventory transaction
        await connection.execute(
          `INSERT INTO inventory_transactions 
           (product_id, type, quantity, reference_type, reference_id, note, created_by) 
           VALUES (?, 'export', ?, 'order', ?, 'Xuất kho cho đơn hàng', ?)`,
          [product_id, quantity, orderId, created_by]
        );
      }

      await connection.commit();
      return orderId;

    } catch (error) {
      await connection.rollback();
      console.error('Order create error:', error.message);
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
        `UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Order updateStatus error:', error.message);
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
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );

      // Hoàn lại tồn kho
      for (const item of items) {
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );

        // Ghi log inventory transaction
        await connection.execute(
          `INSERT INTO inventory_transactions 
           (product_id, type, quantity, reference_type, reference_id, note, created_by) 
           VALUES (?, 'import', ?, 'order', ?, 'Hoàn trả tồn kho do hủy đơn hàng', ?)`,
          [item.product_id, item.quantity, orderId, userId]
        );
      }

      // Cập nhật trạng thái đơn hàng
      const [result] = await connection.execute(
        'UPDATE orders SET order_status = "cancelled" WHERE order_id = ?',
        [orderId]
      );

      await connection.commit();
      return result.affectedRows > 0;

    } catch (error) {
      await connection.rollback();
      console.error('Order cancel error:', error.message);
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
        `SELECT orders.*, users.username as created_by_name
         FROM orders 
         LEFT JOIN users ON orders.created_by = users.user_id
         WHERE orders.customer_id = ?
         ORDER BY orders.created_at DESC
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
      console.error('Order findByCustomer error:', error.message);
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
        FROM orders
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
      console.error('Order getStats error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Order;