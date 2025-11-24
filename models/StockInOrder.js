const { pool } = require('../config/database');

class StockInOrder {
  // Lấy tất cả phiếu nhập
  static async findAll({ page = 1, limit = 10, search = '', status, supplier_id, date_from, date_to }) {
      try {
          const pageNum = parseInt(page) || 1;
          const limitNum = parseInt(limit) || 10;
          const offset = (pageNum - 1) * limitNum;

          let query = `
              SELECT s.*, sup.name as supplier_name, u.username as created_by_name
              FROM stock_in_orders s
              LEFT JOIN suppliers sup ON s.supplier_id = sup.supplier_id
              LEFT JOIN users u ON s.created_by = u.user_id
              WHERE 1=1
          `;

          const params = [];

          if (search) {
              query += ' AND (s.stock_in_order_id = ? OR sup.name LIKE ?)';
              const searchId = parseInt(search) || 0;
              params.push(searchId, `%${search}%`);
          }

          if (status) {
              query += ' AND s.status = ?';
              params.push(status);
          }

          if (supplier_id) {
              query += ' AND s.supplier_id = ?';
              params.push(parseInt(supplier_id));
          }

          if (date_from) {
              query += ' AND DATE(s.created_at) >= ?';
              params.push(date_from);
          }

          if (date_to) {
              query += ' AND DATE(s.created_at) <= ?';
              params.push(date_to);
          }

          query += ` ORDER BY s.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

          console.log('🔍 StockInOrder Query:', query);
          console.log('📊 StockInOrder Params:', params);

          const [rows] = await pool.execute(query, params);

          // Count query
          let countQuery = `
              SELECT COUNT(*) as total
              FROM stock_in_orders s
              LEFT JOIN suppliers sup ON s.supplier_id = sup.supplier_id
              WHERE 1=1
          `;
          
          const countParams = [];

          if (search) {
              countQuery += ' AND (s.stock_in_order_id = ? OR sup.name LIKE ?)';
              const searchId = parseInt(search) || 0;
              countParams.push(searchId, `%${search}%`);
          }

          if (status) {
              countQuery += ' AND s.status = ?';
              countParams.push(status);
          }

          if (supplier_id) {
              countQuery += ' AND s.supplier_id = ?';
              countParams.push(parseInt(supplier_id));
          }

          if (date_from) {
              countQuery += ' AND DATE(s.created_at) >= ?';
              countParams.push(date_from);
          }

          if (date_to) {
              countQuery += ' AND DATE(s.created_at) <= ?';
              countParams.push(date_to);
          }

          const [countRows] = await pool.execute(countQuery, countParams);
          const total = countRows[0].total;

          return {
              stockInOrders: rows,
              pagination: {
                  page: pageNum,
                  limit: limitNum,
                  total,
                  totalPages: Math.ceil(total / limitNum)
              }
          };
      } catch (error) {
          console.error('STOCKINORDER FINDALL ERROR:', error.message);
          throw error;
      }
  }

  // Lấy phiếu nhập bằng ID
  static async findById(stockInOrderId) {
    try {
      const [rows] = await pool.execute(
        `SELECT s.*, sup.name as supplier_name, sup.contact_person, sup.phone as supplier_phone,
        u.username as created_by_name
        FROM stock_in_orders s
        LEFT JOIN suppliers sup ON s.supplier_id = sup.supplier_id
        LEFT JOIN users u ON s.created_by = u.user_id
        WHERE s.stock_in_order_id = ?`,
        [stockInOrderId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy chi tiết phiếu nhập
  static async getStockInItems(stockInOrderId) {
    try {
      const [rows] = await pool.execute(
        `SELECT si.*, p.name as product_name, p.sku as product_sku, p.cost_price as current_cost_price
        FROM stock_in_items si
        JOIN products p ON si.product_id = p.product_id
        WHERE si.stock_in_order_id = ?`,
        [stockInOrderId]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo phiếu nhập mới
  static async create(stockInData, items) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        supplier_id, created_by, total_amount, status = 'draft', note
      } = stockInData;

      // Tạo phiếu nhập
      const [orderResult] = await connection.execute(
        `INSERT INTO stock_in_orders (supplier_id, created_by, total_amount, status, note)
        VALUES (?, ?, ?, ?, ?)`,
        [supplier_id, created_by, total_amount, status, note]
      );

      const stockInOrderId = orderResult.insertId;

      // Thêm các items vào phiếu nhập
      for (const item of items) {
        const { product_id, quantity, unit_cost, total_price } = item;
        await connection.execute(
          `INSERT INTO stock_in_items (stock_in_order_id, product_id, quantity, unit_cost, total_price)
          VALUES (?, ?, ?, ?, ?)`,
          [stockInOrderId, product_id, quantity, unit_cost, total_price]
        );

        // Nếu phiếu nhập đã xác nhận, cập nhật tồn kho và giá vốn
        if (status === 'confirmed') {
          // Cập nhật tồn kho
          await connection.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
            [quantity, product_id]
          );

          // Cập nhật giá vốn bằng giá nhập mới nhất
          await connection.execute(
            'UPDATE products SET cost_price = ? WHERE product_id = ?',
            [unit_cost, product_id]
          );

          // Ghi log inventory transaction
          await connection.execute(
            `INSERT INTO inventory_transactions
            (product_id, type, quantity, reference_type, reference_id, note, created_by)
            VALUES (?, 'import', ?, 'stock_in', ?, 'Nhập kho từ phiếu nhập', ?)`,
            [product_id, quantity, stockInOrderId, created_by]
          );
        }
      }

      await connection.commit();
      return stockInOrderId;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Database error: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Cập nhật trạng thái phiếu nhập
  static async updateStatus(stockInOrderId, status, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Cập nhật tồn kho nếu xác nhận phiếu nhập
      if (status === 'confirmed') {
        // Lấy thông tin hàng
        const [items] = await connection.execute(
          'SELECT product_id, quantity, unit_cost FROM stock_in_items WHERE stock_in_order_id = ?',
          [stockInOrderId]
        );

        for (const item of items) {
          // Cập nhật tồn kho
          await connection.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
            [item.quantity, item.product_id]
          );

          // Cập nhật giá vốn
          await connection.execute(
            'UPDATE products SET cost_price = ? WHERE product_id = ?',
            [item.unit_cost, item.product_id]
          );

          // Ghi log inventory transaction
          await connection.execute(
            `INSERT INTO inventory_transactions
            (product_id, type, quantity, reference_type, reference_id, note, created_by)
            VALUES (?, 'import', ?, 'stock_in', ?, 'Nhập kho từ phiếu nhập', ?)`,
            [item.product_id, item.quantity, stockInOrderId, userId]
          );
        }
      }

      // Cập nhật trạng thái phiếu nhập
      const [result] = await connection.execute(
        'UPDATE stock_in_orders SET status = ? WHERE stock_in_order_id = ?',
        [status, stockInOrderId]
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

  // Hủy phiếu nhập
  static async cancel(stockInOrderId) {
    try {
      const [result] = await pool.execute(
        'UPDATE stock_in_orders SET status = "cancelled" WHERE stock_in_order_id = ?',
        [stockInOrderId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Thống kê nhập hàng
  static async getStats(dateFrom, dateTo) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_value,
          AVG(total_amount) as avg_order_value,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_orders
        FROM stock_in_orders
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

module.exports = StockInOrder;