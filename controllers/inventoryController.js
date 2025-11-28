const { pool } = require('../config/database');

const inventoryController = {
  // Thống kê tồn kho hiện tại
  getCurrentInventory: async (req, res) => {
    try {
      const { 
        search,
        page = 1,
        limit = 20
      } = req.query;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (p.sku LIKE ? OR p.name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Query chính - SỬA LẠI THEO CẤU TRÚC BẢNG CỦA BẠN
      let query = `
        SELECT 
          p.product_id,
          p.sku,
          p.name as product_name,
          p.stock_quantity,
          p.price,
          p.cost_price,
          (p.stock_quantity * p.cost_price) as inventory_value,
          CASE
            WHEN p.stock_quantity = 0 THEN 'out_of_stock'
            WHEN p.stock_quantity < 10 THEN 'low'
            WHEN p.stock_quantity >= 10 AND p.stock_quantity < 50 THEN 'normal'
            ELSE 'high'
          END as stock_status
        FROM products p
        ${whereClause}
        ORDER BY p.stock_quantity ASC 
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      const [products] = await pool.execute(query, params);

      // Đếm tổng số
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${whereClause}
      `;
      const [countResult] = await pool.execute(countQuery, params.slice(0, -2));

      // Tính tổng giá trị tồn kho
      const [summary] = await pool.execute(`
        SELECT 
          COUNT(*) as total_products,
          SUM(stock_quantity) as total_quantity,
          SUM(stock_quantity * cost_price) as total_inventory_value,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_count,
          COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity < 10 THEN 1 END) as low_stock_count,
          COUNT(CASE WHEN stock_quantity >= 10 AND stock_quantity < 50 THEN 1 END) as normal_stock_count,
          COUNT(CASE WHEN stock_quantity >= 50 THEN 1 END) as high_stock_count
        FROM products
      `);

      res.json({
        success: true,
        data: {
          products,
          summary: summary[0],
          pagination: {
            current_page: pageNum,
            limit: limitNum,
            total: countResult[0].total,
            total_pages: Math.ceil(countResult[0].total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Get current inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê tồn kho'
      });
    }
  },

  // Thống kê tồn kho tính đến ngày
  getInventoryByDate: async (req, res) => {
    try {
      const { date, product_id } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ngày cần thống kê (date)'
        });
      }

      let productFilter = '';
      const params = [date, date, date, date];

      if (product_id) {
        productFilter = 'AND p.product_id = ?';
        params.push(product_id);
      }

      // Tính tồn kho tại thời điểm date
      const query = `
        SELECT 
          p.product_id,
          p.sku,
          p.name as product_name,
          p.stock_quantity as current_stock,
          
          -- Tổng số lượng nhập từ đầu đến date
          COALESCE(SUM(CASE 
            WHEN sio.status = 'confirmed' 
            AND DATE(sio.created_at) <= ? 
            THEN sii.quantity 
            ELSE 0 
          END), 0) as total_stock_in,
          
          -- Tổng số lượng bán từ đầu đến date
          COALESCE(SUM(CASE 
            WHEN o.order_status IN ('completed', 'confirmed')
            AND DATE(o.created_at) <= ? 
            THEN oi.quantity 
            ELSE 0 
          END), 0) as total_stock_out,
          
          -- Tồn kho tính đến date = nhập - xuất
          (
            COALESCE(SUM(CASE 
              WHEN sio.status = 'confirmed' 
              AND DATE(sio.created_at) <= ? 
              THEN sii.quantity 
              ELSE 0 
            END), 0)
            -
            COALESCE(SUM(CASE 
              WHEN o.order_status IN ('completed', 'confirmed')
              AND DATE(o.created_at) <= ? 
              THEN oi.quantity 
              ELSE 0 
            END), 0)
          ) as stock_at_date
          
        FROM products p
        LEFT JOIN stock_in_items sii ON p.product_id = sii.product_id
        LEFT JOIN stock_in_orders sio ON sii.stock_in_order_id = sio.stock_in_order_id
        LEFT JOIN order_items oi ON p.product_id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.order_id
        WHERE 1=1 ${productFilter}
        GROUP BY p.product_id, p.sku, p.name, p.stock_quantity
        ORDER BY p.product_id
      `;

      const [products] = await pool.execute(query, params);

      res.json({
        success: true,
        data: {
          date,
          products,
          total_products: products.length
        }
      });
    } catch (error) {
      console.error('Get inventory by date error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi thống kê tồn kho theo ngày'
      });
    }
  },

  // Thống kê sản phẩm sắp hết hàng
  getLowStock: async (req, res) => {
    try {
      const { threshold = 10 } = req.query;

      const [products] = await pool.execute(`
        SELECT 
          p.product_id,
          p.sku,
          p.name as product_name,
          p.stock_quantity,
          p.price,
          p.cost_price,
          CASE
            WHEN p.stock_quantity = 0 THEN 'Hết hàng'
            WHEN p.stock_quantity < ? THEN 'Sắp hết'
            ELSE 'Bình thường'
          END as status
        FROM products p
        WHERE p.stock_quantity < ?
        ORDER BY p.stock_quantity ASC
      `, [threshold, threshold]);

      res.json({
        success: true,
        data: {
          products,
          total: products.length,
          threshold
        }
      });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách sản phẩm sắp hết hàng'
      });
    }
  },

  // Lịch sử xuất nhập kho của sản phẩm
  getProductInventoryHistory: async (req, res) => {
    try {
      const { product_id } = req.params;
      const { date_from, date_to, page = 1, limit = 20 } = req.query;

      let whereClause = '';
      const params = [];

      if (date_from) {
        whereClause += ' AND DATE(transaction_date) >= ?';
        params.push(date_from);
      }

      if (date_to) {
        whereClause += ' AND DATE(transaction_date) <= ?';
        params.push(date_to);
      }

      const offset = (page - 1) * limit;

      // Lấy thông tin sản phẩm
      const [product] = await pool.execute(
        'SELECT product_id, sku, name, stock_quantity FROM products WHERE product_id = ?',
        [product_id]
      );

      if (product.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }

      // Lịch sử nhập hàng
      const stockInQuery = `
        SELECT 
          'stock_in' as type,
          sii.quantity,
          sii.unit_cost as price,
          sio.created_at as transaction_date,
          sio.stock_in_order_id as reference_id,
          'Nhập kho' as note,
          u.full_name as created_by_name
        FROM stock_in_items sii
        JOIN stock_in_orders sio ON sii.stock_in_order_id = sio.stock_in_order_id
        LEFT JOIN users u ON sio.created_by = u.user_id
        WHERE sii.product_id = ? AND sio.status = 'confirmed'
        ${whereClause}
      `;

      // Lịch sử bán hàng
      const orderQuery = `
        SELECT 
          'order' as type,
          oi.quantity * -1 as quantity,
          oi.unit_price as price,
          o.created_at as transaction_date,
          o.order_id as reference_id,
          CONCAT('Đơn hàng #', o.order_id) as note,
          u.full_name as created_by_name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        LEFT JOIN users u ON o.created_by = u.user_id
        WHERE oi.product_id = ? AND o.status IN ('completed', 'confirmed')
        ${whereClause}
      `;

      // Kết hợp 2 query và sắp xếp
      const combinedQuery = `
        (${stockInQuery})
        UNION ALL
        (${orderQuery})
        ORDER BY transaction_date DESC
        LIMIT ? OFFSET ?
      `;

      const queryParams = [product_id, ...params, product_id, ...params, parseInt(limit), offset];
      const [transactions] = await pool.execute(combinedQuery, queryParams);

      res.json({
        success: true,
        data: {
          product: product[0],
          transactions,
          pagination: {
            current_page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get product inventory history error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy lịch sử xuất nhập kho'
      });
    }
  }
};

module.exports = inventoryController;