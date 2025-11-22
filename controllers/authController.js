const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const authController = {
  // Đăng nhập
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Điều kiện
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username và password là bắt buộc'
        });
      }

      // Tìm user
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Username hoặc password không đúng'
        });
      }

      // So sánh password
      const isPasswordValid = await User.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Username hoặc password không đúng'
        });
      }

      // Tạo token
      const token = generateToken({
        userId: user.user_id,
        username: user.username,
        role: user.role
      });

      // Trả về thông tin user (không bao gồm password)
      const userResponse = {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
      };

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng nhập'
      });
    }
  },

  // Lấy thông tin user hiện tại
  getMe: async (req, res) => {
    try {
      const user = await User.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userResponse = {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at
      };

      res.json({
        success: true,
        data: { user: userResponse }
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin user'
      });
    }
  }
};

module.exports = authController;