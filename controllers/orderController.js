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
      try {
        const { customer_id, items, note } = req.body;
        const created_by = req.user.user_id;

        // Điều kiện
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Danh sách sản phẩm là bắt buộc'
          });
        }

      // Kiểm tra tồn kho và tính toán
      let final_amount = 0;
      const orderItems = [];

      for (const item of items) {
        const { product_id, quantity } = item;

        if (!product_id || !quantity || quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Thông tin sản phẩm không hợp lệ'
          });
        }

        // Lấy thông tin sản phẩm
        const product = await Product.findById(product_id);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Sản phẩm với ID ${product_id} không tồn tại`
          });
        }

        if (product.stock_quantity < quantity) {
          return res.status(400).json({
            success: false,
            message: `Sản phẩm "${product.name}" không đủ tồn kho. Tồn kho: ${product.stock_quantity}`
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


      const orderData = {
        customer_id: customer_id || null,
        created_by,
        final_amount,
        note
      };

      const orderId = await Order.create(orderData, orderItems);

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: { 
          order_id: orderId,
          final_amount
        }
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo đơn hàng'
      });
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