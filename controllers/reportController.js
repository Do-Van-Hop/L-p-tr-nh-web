const { pool } = require('../config/database');

const reportController = {
  // Báo cáo doanh thu
  getSalesReport: async (req, res) => {
    try {
      const { period = 'daily', date_from, date_to } = req.query;

      let dateFormat, groupBy;
      
      switch (period) {
        case 'daily':
          dateFormat = '%Y-%m-%d';
          groupBy = 'DATE(created_at)';
          break;
        case 'weekly':
          dateFormat = '%Y-%u';
          groupBy = 'YEARWEEK(created_at)';
          break;
        case 'monthly':
          dateFormat = '%Y-%m';
          groupBy = 'YEAR(created_at), MONTH(created_at)';
          break;
        default:
          dateFormat = '%Y-%m-%d';
          groupBy = 'DATE(created_at)';
      }

      let query = `
        SELECT 
          DATE_FORMAT(created_at, ?) as period,
          COUNT(*) as total_orders,
          SUM(final_amount) as total_revenue,
          AVG(final_amount) as avg_order_value,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COUNT(CASE WHEN order_status = 'completed' THEN 1 END) as completed_orders
        FROM ORDERS
        WHERE order_status != 'cancelled'
      `;
      const params = [dateFormat];

      if (date_from) {
        query += ' AND DATE(created_at) >= ?';
        params.push(date_from);
      }

      if (date_to) {
        query += ' AND DATE(created_at) <= ?';
        params.push(date_to);
      }

      query += ` GROUP BY ${groupBy} ORDER BY period DESC LIMIT 30`;

      const [rows] = await pool.execute(query, params);

      res.json({
        success: true,
        data: { reports: rows },
        period,
        total: rows.length
      });
    } catch (error) {
      console.error('Get sales report error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy báo cáo doanh thu'
      });
    }
  },

  // Báo cáo sản phẩm bán chạy
  getTopProducts: async (req, res) => {
    try {
      const { limit = 10, date_from, date_to } = req.query;

      let query = `
        SELECT 
          p.product_id,
          p.name,
          p.sku,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total_price) as total_revenue,
          COUNT(DISTINCT oi.order_id) as total_orders
        FROM ORDER_ITEMS oi
        JOIN PRODUCTS p ON oi.product_id = p.product_id
        JOIN ORDERS o ON oi.order_id = o.order_id
        WHERE o.order_status = 'completed'
      `;
      const params = [];

      if (date_from) {
        query += ' AND DATE(o.created_at) >= ?';
        params.push(date_from);
      }

      if (date_to) {
        query += ' AND DATE(o.created_at) <= ?';
        params.push(date_to);
      }

      query += `
        GROUP BY p.product_id, p.name, p.sku
        ORDER BY total_sold DESC
        LIMIT ?
      `;
      params.push(parseInt(limit));

      const [rows] = await pool.execute(query, params);

      res.json({
        success: true,
        data: { products: rows },
        total: rows.length
      });
    } catch (error) {
      console.error('Get top products error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy báo cáo sản phẩm bán chạy'
      });
    }
  },

  // Báo cáo tồn kho
  getInventoryReport: async (req, res) => {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          p.product_id,
          p.name,
          p.sku,
          p.stock_quantity,
          p.min_stock,
          p.max_stock,
          p.cost_price,
          p.price,
          c.name as category_name,
          s.name as supplier_name,
          CASE 
            WHEN p.stock_quantity <= p.min_stock THEN 'low'
            WHEN p.stock_quantity >= p.max_stock THEN 'high' 
            ELSE 'normal'
          END as stock_status
        FROM PRODUCTS p
        LEFT JOIN CATEGORIES c ON p.category_id = c.category_id
        LEFT JOIN SUPPLIERS s ON p.supplier_id = s.supplier_id
        WHERE p.status = 'active'
        ORDER BY stock_status, p.stock_quantity ASC
      `);

      const summary = {
        total_products: rows.length,
        low_stock: rows.filter(p => p.stock_status === 'low').length,
        normal_stock: rows.filter(p => p.stock_status === 'normal').length,
        high_stock: rows.filter(p => p.stock_status === 'high').length,
        total_inventory_value: rows.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0)
      };

      res.json({
        success: true,
        data: { 
          products: rows,
          summary
        }
      });
    } catch (error) {
      console.error('Get inventory report error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy báo cáo tồn kho'
      });
    }
  }
};

module.exports = reportController;