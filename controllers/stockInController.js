const StockInOrder = require('../models/StockInOrder');
const Product = require('../models/Product');

const stockInController = {
  // Lấy danh sách phiếu nhập
  getAllStockInOrders: async (req, res) => {
    try {
      const { page, limit, search, status, supplier_id, date_from, date_to } = req.query;

      const result = await StockInOrder.findAll({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        status,
        supplier_id,
        date_from,
        date_to
      });

      res.json({
        success: true,
        data: result.stockInOrders,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all stock in orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách phiếu nhập'
      });
    }
  },

  // Lấy thông tin phiếu nhập bằng ID
  getStockInOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const stockInOrder = await StockInOrder.findById(id);

      if (!stockInOrder) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập'
        });
      }

      const items = await StockInOrder.getStockInItems(id);

      res.json({
        success: true,
        data: { 
          stockInOrder: {
            ...stockInOrder,
            items
          }
        }
      });
    } catch (error) {
      console.error('Get stock in order by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin phiếu nhập'
      });
    }
  },

  // Tạo phiếu nhập mới
  createStockInOrder: async (req, res) => {
    try {
      const { supplier_id, items, note } = req.body;
      const created_by = req.user.user_id;

      // Validate required fields
      if (!supplier_id) {
        return res.status(400).json({
          success: false,
          message: 'Nhà cung cấp là bắt buộc'
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách sản phẩm là bắt buộc và không được rỗng'
        });
      }

      // Tính tổng giá trị phiếu nhập
      let total_amount = 0;
      const stockInItems = [];

      for (const item of items) {
        const { product_id, quantity, unit_cost } = item;

        if (!product_id || !quantity || quantity <= 0 || !unit_cost || unit_cost < 0) {
          return res.status(400).json({
            success: false,
            message: 'Thông tin sản phẩm không hợp lệ'
          });
        }

        // Kiểm tra sản phẩm có tồn tại không
        const product = await Product.findById(product_id);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Sản phẩm với ID ${product_id} không tồn tại`
          });
        }

        const total_price = unit_cost * quantity;
        total_amount += total_price;

        stockInItems.push({
          product_id,
          quantity,
          unit_cost,
          total_price
        });
      }

      const stockInData = {
        supplier_id,
        created_by,
        total_amount,
        note
      };

      const stockInOrderId = await StockInOrder.create(stockInData, stockInItems);

      res.status(201).json({
        success: true,
        message: 'Tạo phiếu nhập thành công',
        data: { 
          stock_in_order_id: stockInOrderId,
          total_amount
        }
      });
    } catch (error) {
      console.error('Create stock in order error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo phiếu nhập'
      });
    }
  },

  // Cập nhật trạng thái phiếu nhập
  updateStockInOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.user_id;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái là bắt buộc'
        });
      }

      const validStatuses = ['draft', 'confirmed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(', ')}`
        });
      }

      let success;
      if (status === 'confirmed') {
        success = await StockInOrder.updateStatus(id, status, userId);
      } else {
        success = await StockInOrder.cancel(id);
      }

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập để cập nhật'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật phiếu nhập thành công'
      });
    } catch (error) {
      console.error('Update stock in order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật phiếu nhập'
      });
    }
  },

  // Thống kê nhập hàng
  getStockInStats: async (req, res) => {
    try {
      const { date_from, date_to } = req.query;

      const stats = await StockInOrder.getStats(date_from, date_to);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get stock in stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê nhập hàng'
      });
    }
  }
};

module.exports = stockInController;