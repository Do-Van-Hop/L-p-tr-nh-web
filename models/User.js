const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Tìm user bằng username
  static async findByUsername(username) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM USERS WHERE username = ? AND is_active = "active"',
        [username]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tìm user bằng ID
  static async findById(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT user_id, username, role, is_active, created_at FROM USERS WHERE user_id = ?',
        [userId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo user mới
  static async create(userData) {
    const { username, password, role = 'staff' } = userData;
    
    try {
      // Mã hóa password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const [result] = await pool.execute(
        'INSERT INTO USERS (username, password_hash, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );
      
      return result.insertId;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // So sánh password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Lấy danh sách users (cho quản lý)
  static async findAll() {
    try {
      const [rows] = await pool.execute(
        'SELECT user_id, username, role, is_active, created_at FROM USERS ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
  // Cập nhật thông tin user
  static async update(userId, updateData) {
    try {
      const allowedFields = ['username', 'role', 'is_active', 'full_name', 'email', 'phone'];
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

      values.push(userId);

      const [result] = await pool.execute(
        `UPDATE USERS SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Đổi mật khẩu
  static async changePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const [result] = await pool.execute(
        'UPDATE USERS SET password_hash = ? WHERE user_id = ?',
        [hashedPassword, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Xóa use
  static async delete(userId) {
    try {
      const [result] = await pool.execute(
        'UPDATE USERS SET is_active = "inactive" WHERE user_id = ?',
        [userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy user bằng ID (chi tiết tt)
  static async getById(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT user_id, username, role, is_active, full_name, email, phone, created_at 
         FROM USERS WHERE user_id = ?`,
        [userId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = User;