const Customer = require('../models/Customer');

const customerController = {
  // Ds khách hàng
  getAllCustomers: async (req, res) => {
    try {
      const { page, limit, search } = req.query;

      const result = await Customer.findAll({
        page: page || 1,
        limit: limit || 10,
        search: search || ''
      });

      res.json({
        success: true,
        data: result.customers,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách khách hàng'
      });
    }
  },

  // Lấy tt khách hàng bằng ID
  getCustomerById: async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khách hàng'
        });
      }

      res.json({
        success: true,
        data: { customer }
      });
    } catch (error) {
      console.error('Get customer by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin khách hàng'
      });
    }
  },

  // Tạo khách hàng mới
  createCustomer: async (req, res) => {
    try {
      const { name, birth_year,  phone, email, address, loyalty_points } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Tên khách hàng là bắt buộc'
        });
      }

      // Validate birth_year nếu có
      if (birth_year) {
          const currentYear = new Date().getFullYear();
          if (birth_year < 1900 || birth_year > currentYear) {
              return res.status(400).json({
                  success: false,
                  message: 'Năm sinh không hợp lệ'
              });
          }
      }

      if (phone) {
        const existingCustomer = await Customer.findByPhone(phone);
        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại đã tồn tại'
          });
        }
      }

      const customerId = await Customer.create({
        name,
        phone,
        email,
        address,
        loyalty_points
      });

      res.status(201).json({
        success: true,
        message: 'Tạo khách hàng thành công',
        data: { customer_id: customerId }
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo khách hàng'
      });
    }
  },

  // Cập nhật khách hàng
  updateCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Nếu cập nhật số điện thoại, kiểm tra trùng
      if (updateData.phone) {
        const existingCustomer = await Customer.findByPhone(updateData.phone);
        if (existingCustomer && existingCustomer.customer_id != id) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại đã tồn tại'
          });
        }
      }

      const success = await Customer.update(id, updateData);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khách hàng để cập nhật'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật khách hàng thành công'
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật khách hàng'
      });
    }
  },

  // Xóa khách hàng
  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params;

      const success = await Customer.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khách hàng để xóa'
        });
      }

      res.json({
        success: true,
        message: 'Xóa khách hàng thành công'
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa khách hàng'
      });
    }
  },

  // Tìm kiếm khách hàng
  searchCustomers: async (req, res) => {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Query search là bắt buộc'
        });
      }

      const customers = await Customer.search(q, limit || 10);

      res.json({
        success: true,
        data: { customers }
      });
    } catch (error) {
      console.error('Search customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tìm kiếm khách hàng'
      });
    }
  },

  // Cập nhật điểm tích lũy
  updateLoyaltyPoints: async (req, res) => {
    try {
      const { id } = req.params;
      const { points } = req.body;

      if (points === undefined || points === null) {
        return res.status(400).json({
          success: false,
          message: 'Điểm tích lũy là bắt buộc'
        });
      }

      if (points < 0) {
        return res.status(400).json({
          success: false,
          message: 'Điểm tích lũy không được âm'
        });
      }

      const success = await Customer.updateLoyaltyPoints(id, points);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khách hàng để cập nhật'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật điểm tích lũy thành công'
      });
    } catch (error) {
      console.error('Update loyalty points error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật điểm tích lũy'
      });
    }
  },

  // Lịch sử mua
  getPurchaseHistory: async (req, res) => {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;

      const result = await Customer.getPurchaseHistory(id, {
        page: page || 1,
        limit: limit || 10
      });

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get purchase history error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy lịch sử mua hàng'
      });
    }
  },

  // TK mua hàng của khách hàng
  getPurchaseStats: async (req, res) => {
    try {
      const { id } = req.params;

      const stats = await Customer.getPurchaseStats(id);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get purchase stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê mua hàng'
      });
    }
  }
};

module.exports = customerController;