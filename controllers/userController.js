const User = require('../models/User');

const userController = {
  // Lấy danh sách users
  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll();
      
      res.json({
        success: true,
        data: { users },
        total: users.length
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách users'
      });
    }
  },

  // Lấy thông tin user bằng ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.getById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin user'
      });
    }
  },

  // Tạo user mới
  createUser: async (req, res) => {
    try {
      const { username, password, role, full_name, email, phone } = req.body;

      // điều kiện
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username và password là bắt buộc'
        });
      }

      // Check user
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username đã tồn tại'
        });
      }

      const userId = await User.create({
        username,
        password,
        role: role || 'staff',
        full_name,
        email,
        phone
      });

      res.status(201).json({
        success: true,
        message: 'Tạo user thành công',
        data: { user_id: userId }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo user'
      });
    }
  },

  // Cập nhật user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Không cho phép cập nhật password qua API này
      delete updateData.password;
      delete updateData.password_hash;

      const success = await User.update(id, updateData);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user để cập nhật'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật user thành công'
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật user'
      });
    }
  },

  // Đổi mật khẩu
  changePassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
      }

      const success = await User.changePassword(id, newPassword);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user để đổi mật khẩu'
        });
      }

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đổi mật khẩu'
      });
    }
  },

    // CẬP NHẬT THÔNG TIN CÁ NHÂN
  updateProfile: async (req, res) => {
      try {
          const userId = req.user.user_id;
          const { full_name, email, phone } = req.body;

          // CHỈ cho phép cập nhật các field này
          const updateData = { full_name, email, phone };
          
          // Loại bỏ các field undefined
          Object.keys(updateData).forEach(key => {
              if (updateData[key] === undefined) {
                  delete updateData[key];
              }
          });

          if (Object.keys(updateData).length === 0) {
              return res.status(400).json({
                  success: false,
                  message: 'Không có dữ liệu để cập nhật'
              });
          }

          const success = await User.update(userId, updateData);
          
          if (!success) {
              return res.status(404).json({
                  success: false,
                  message: 'Không tìm thấy user để cập nhật'
              });
          }

          res.json({
              success: true,
              message: 'Cập nhật thông tin thành công'
          });
      } catch (error) {
          console.error('Update profile error:', error);
          res.status(500).json({
              success: false,
              message: 'Lỗi server khi cập nhật thông tin'
          });
      }
  },

  // ĐỔI MẬT KHẨU CÁ NHÂN
  changeOwnPassword: async (req, res) => {
      try {
          const userId = req.user.user_id;
          const { currentPassword, newPassword } = req.body;

          if (!currentPassword || !newPassword) {
              return res.status(400).json({
                  success: false,
                  message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc'
              });
          }

          if (newPassword.length < 6) {
              return res.status(400).json({
                  success: false,
                  message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
              });
          }

          // Lấy thông tin user để kiểm tra mật khẩu hiện tại
          const user = await User.findById(userId);
          if (!user) {
              return res.status(404).json({
                  success: false,
                  message: 'Không tìm thấy user'
              });
          }

          // Kiểm tra mật khẩu hiện tại
          const isCurrentPasswordValid = await User.comparePassword(currentPassword, user.password_hash);
          if (!isCurrentPasswordValid) {
              return res.status(400).json({
                  success: false,
                  message: 'Mật khẩu hiện tại không đúng'
              });
          }

          // Đổi mật khẩu
          const success = await User.changePassword(userId, newPassword);
          if (!success) {
              return res.status(500).json({
                  success: false,
                  message: 'Lỗi khi đổi mật khẩu'
              });
          }

          res.json({
              success: true,
              message: 'Đổi mật khẩu thành công'
          });
      } catch (error) {
          console.error('Change own password error:', error);
          res.status(500).json({
              success: false,
              message: 'Lỗi server khi đổi mật khẩu'
          });
      }
  },

  // Xóa user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Xóa chính mình(đéo)
      if (parseInt(id) === req.user.user_id) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa tài khoản của chính mình'
        });
      }

      const success = await User.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user để xóa'
        });
      }

      res.json({
        success: true,
        message: 'Xóa user thành công'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa user'
      });
    }
  }
};

module.exports = userController;