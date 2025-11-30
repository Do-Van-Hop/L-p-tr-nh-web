const { pool } = require('../config/database');
const Order = require('../models/Order');
const Product = require('../models/Product');

const orderController = {
  // Lấy danh sách đơn hàng
  getAllOrders: async (req, res) => {
    try {
      const { page, limit, search, status, payment_status, date_from, date_to } = req.query;

      const result = await Order.findAll({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        status,
        payment_status,
        date_from,
        date_to
      });

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách đơn hàng'
      });
    }
  },

  // Lấy thông tin đơn hàng bằng ID
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      const items = await Order.getOrderItems(id);

      res.json({
        success: true,
        data: { 
          order: {
            ...order,
            items
          }
        }
      });
    } catch (error) {
      console.error('Get order by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin đơn hàng'
      });
    }
  },

    // Tạo đơn hàng mới
  createOrder: async (req, res) => {
      const connection = await pool.getConnection();
      
      try {
          await connection.beginTransaction();

          const { customer_id, items, note } = req.body;
          const created_by = req.user.user_id;

          // ✅ VALIDATION CƠ BẢN
          if (!items || !Array.isArray(items) || items.length === 0) {
              await connection.rollback();
              return res.status(400).json({
                  success: false,
                  message: 'Danh sách sản phẩm là bắt buộc và không được rỗng'
              });
          }

          // ✅ TÍNH TOÁN VÀ KIỂM TRA TỒN KHO
          let final_amount = 0;
          const orderItems = [];

          for (const item of items) {
              const { product_id, quantity } = item;
              
              if (!product_id || !quantity || quantity <= 0) {
                  await connection.rollback();
                  return res.status(400).json({
                      success: false,
                      message: 'Thông tin sản phẩm không hợp lệ: product_id và quantity là bắt buộc'
                  });
              }

              // Lấy thông tin sản phẩm từ database
              const [products] = await connection.execute(
                  `SELECT product_id, name, sku, price, stock_quantity 
                  FROM products WHERE product_id = ? AND status = 'active'`,
                  [product_id]
              );

              if (products.length === 0) {
                  await connection.rollback();
                  return res.status(400).json({
                      success: false,
                      message: `Sản phẩm với ID ${product_id} không tồn tại hoặc đã bị xóa`
                  });
              }

              const product = products[0];

              // Kiểm tra tồn kho
              if (product.stock_quantity < quantity) {
                  await connection.rollback();
                  return res.status(400).json({
                      success: false,
                      message: `Sản phẩm "${product.name}" không đủ tồn kho. Tồn kho: ${product.stock_quantity}, Yêu cầu: ${quantity}`
                  });
              }

              const unit_price = product.price;
              const total_price = unit_price * quantity;
              final_amount += total_price;

              orderItems.push({
                  product_id,
                  name: product.name,
                  quantity,
                  unit_price,
                  total_price
              });
          }

          // ✅ TẠO ĐƠN HÀNG - CHỈ CÁC TRƯỜNG CÓ SẴN TRONG DATABASE
          const [orderResult] = await connection.execute(
              `INSERT INTO orders 
              (customer_id, created_by, final_amount, payment_status, order_status, note) 
              VALUES (?, ?, ?, 'pending', 'confirmed', ?)`,
              [customer_id, created_by, final_amount, note]
          );

          const orderId = orderResult.insertId;

          // ✅ THÊM ORDER ITEMS
          for (const item of orderItems) {
              const { product_id, name, quantity, unit_price, total_price } = item;

              await connection.execute(
                  `INSERT INTO order_items 
                  (order_id, product_id, name, quantity, unit_price, total_price) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
                  [orderId, product_id, name, quantity, unit_price, total_price]
              );

              // ✅ CẬP NHẬT TỒN KHO
              await connection.execute(
                  'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
                  [quantity, product_id]
              );

              // ✅ GHI LOG INVENTORY TRANSACTION
              await connection.execute(
                  `INSERT INTO inventory_transactions 
                  (product_id, type, quantity, reference_type, reference_id, note, created_by) 
                  VALUES (?, 'export', ?, 'order', ?, 'Xuất kho cho đơn hàng', ?)`,
                  [product_id, quantity, orderId, created_by]
              );
          }

          await connection.commit();

          // ✅ LẤY THÔNG TIN ĐƠN HÀNG VỪA TẠO - CHỈ CÁC TRƯỜNG CÓ SẴN
          const [orderRows] = await connection.execute(
              `SELECT 
                  o.*,
                  c.name as customer_name,
                  c.phone as customer_phone,
                  c.email as customer_email,
                  c.address as customer_address,
                  u.username as created_by_username,
                  u.full_name as created_by_name
              FROM orders o
              LEFT JOIN customers c ON o.customer_id = c.customer_id
              LEFT JOIN users u ON o.created_by = u.user_id
              WHERE o.order_id = ?`,
              [orderId]
          );

          // ✅ LẤY DANH SÁCH SẢN PHẨM TRONG ĐƠN HÀNG
          const [itemRows] = await connection.execute(
              `SELECT 
                  oi.*,
                  p.sku as product_sku,
                  p.description as product_description
              FROM order_items oi
              LEFT JOIN products p ON oi.product_id = p.product_id
              WHERE oi.order_id = ?`,
              [orderId]
          );

          const orderWithDetails = {
              ...orderRows[0],
              items: itemRows
          };

          // ✅ TRẢ VỀ RESPONSE CHO FE
          res.status(201).json({
              success: true,
              message: 'Tạo đơn hàng thành công',
              data: {
                  order: orderWithDetails
              }
          });

      } catch (error) {
          await connection.rollback();
          console.error('Create order error:', error);
          
          res.status(500).json({
              success: false,
              message: 'Lỗi server khi tạo đơn hàng',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          connection.release();
      }
  },
  // Cập nhật trạng thái đơn hàng
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { order_status, payment_status, note } = req.body;

      if (!order_status && !payment_status) {
        return res.status(400).json({
          success: false,
          message: 'Cần cung cấp order_status hoặc payment_status để cập nhật'
        });
      }

      const updateData = {};
      if (order_status) updateData.order_status = order_status;
      if (payment_status) updateData.payment_status = payment_status;
      if (note) updateData.note = note;

      const success = await Order.updateStatus(id, updateData);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng để cập nhật'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật đơn hàng thành công'
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật đơn hàng'
      });
    }
  },

  // Hủy đơn hàng
  cancelOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const success = await Order.cancel(id, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng để hủy'
        });
      }

      res.json({
        success: true,
        message: 'Hủy đơn hàng thành công'
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi hủy đơn hàng'
      });
    }
  },

  // Lấy đơn hàng theo khách hàng
  getOrdersByCustomer: async (req, res) => {
    try {
      const { customerId } = req.params;
      const { page, limit } = req.query;

      const result = await Order.findByCustomer(customerId, {
        page: page || 1,
        limit: limit || 10
      });

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get orders by customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy đơn hàng theo khách hàng'
      });
    }
  },

  // Thống kê đơn hàng
  getOrderStats: async (req, res) => {
    try {
      const { date_from, date_to } = req.query;

      const stats = await Order.getStats(date_from, date_to);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê đơn hàng'
      });
    }
  }
};

module.exports = orderController;