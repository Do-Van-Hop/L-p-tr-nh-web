const validateUserCreate = (req, res, next) => {
    const { username, password, role } = req.body;

    if (!username || username.length < 3) {
        return res.status(400).json({
            success: false,
            message: 'Username phải có ít nhất 3 ký tự'
        });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password phải có ít nhất 6 ký tự'
        });
    }

    if (role && !['manager', 'staff'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Role phải là manager hoặc staff'
        });
    }

    next();
};

const validateUserUpdate = (req, res, next) => {
    const { role, username } = req.body;

    if (role && !['manager', 'staff'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Role phải là manager hoặc staff'
        });
    }

    if (username && username.length < 3) {
        return res.status(400).json({
            success: false,
            message: 'Username phải có ít nhất 3 ký tự'
        });
    }

    next();
};

const validateProfileUpdate = (req, res, next) => {
    const { full_name, email, phone } = req.body;

    if (full_name && full_name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Họ tên không được để trống'
        });
    }

    if (email && !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ'
        });
    }

    if (phone && phone.length > 20) {
        return res.status(400).json({
            success: false,
            message: 'Số điện thoại không được vượt quá 20 ký tự'
        });
    }

    next();
};

// Helper function to validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
const validateProductCreate = (req, res, next) => {
  const { name, category_id, supplier_id, price } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tên sản phẩm là bắt buộc'
    });
  }

  if (!category_id) {
    return res.status(400).json({
      success: false,
      message: 'Danh mục là bắt buộc'
    });
  }

  if (!supplier_id) {
    return res.status(400).json({
      success: false,
      message: 'Nhà cung cấp là bắt buộc'
    });
  }

  if (!price || parseFloat(price) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Giá sản phẩm phải là số dương'
    });
  }

  next();
};

const validateProductUpdate = (req, res, next) => {
  const { price, cost_price, stock_quantity, min_stock, max_stock } = req.body;

  if (price && parseFloat(price) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Giá sản phẩm phải là số dương'
    });
  }

  if (cost_price && parseFloat(cost_price) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Giá vốn phải là số dương'
    });
  }

  if (stock_quantity && parseInt(stock_quantity) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Số lượng tồn kho không được âm'
    });
  }

  if (min_stock && parseInt(min_stock) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Số lượng tối thiểu không được âm'
    });
  }

  if (max_stock && parseInt(max_stock) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Số lượng tối đa không được âm'
    });
  }

  next();
};

const validateOrderCreate = (req, res, next) => {
  const { items, discount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Danh sách sản phẩm là bắt buộc và không được rỗng'
    });
  }

  for (const item of items) {
    if (!item.product_id || !item.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Mỗi sản phẩm cần có product_id và quantity'
      });
    }

    if (item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng sản phẩm phải lớn hơn 0'
      });
    }
  }

  if (discount && parseFloat(discount) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Giảm giá không được âm'
    });
  }



  next();
};

const validateOrderStatusUpdate = (req, res, next) => {
  const { order_status, payment_status } = req.body;

  const validOrderStatuses = ['draft', 'confirmed', 'completed', 'cancelled'];
  const validPaymentStatuses = ['pending', 'paid', 'refunded'];

  if (order_status && !validOrderStatuses.includes(order_status)) {
    return res.status(400).json({
      success: false,
      message: `Trạng thái đơn hàng không hợp lệ. Chấp nhận: ${validOrderStatuses.join(', ')}`
    });
  }

  if (payment_status && !validPaymentStatuses.includes(payment_status)) {
    return res.status(400).json({
      success: false,
      message: `Trạng thái thanh toán không hợp lệ. Chấp nhận: ${validPaymentStatuses.join(', ')}`
    });
  }

  next();
};

const validateStockInCreate = (req, res, next) => {
  const { supplier_id, items } = req.body;

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

  for (const item of items) {
    if (!item.product_id || !item.quantity || !item.unit_cost) {
      return res.status(400).json({
        success: false,
        message: 'Mỗi sản phẩm cần có product_id, quantity và unit_cost'
      });
    }

    if (item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng sản phẩm phải lớn hơn 0'
      });
    }

    if (item.unit_cost < 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá nhập không được âm'
      });
    }
  }

  next();
};

const validateStockInStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  const validStatuses = ['draft', 'confirmed', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(', ')}`
    });
  }

  next();
};

const validateCustomerCreate = (req, res, next) => {
  const { name, birth_year, phone, email } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tên khách hàng là bắt buộc'
    });
  }

    if (birth_year) {
        const currentYear = new Date().getFullYear();
        if (typeof birth_year !== 'number' || birth_year < 1900 || birth_year > currentYear) {
            return res.status(400).json({
                success: false,
                message: 'Năm sinh không hợp lệ (phải từ 1900 đến hiện tại)'
            });
        }
    }
  if (phone && phone.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không được vượt quá 20 ký tự'
    });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email không hợp lệ'
    });
  }

  next();
};

const validateCustomerUpdate = (req, res, next) => {
  const { name, phone, email } = req.body;

  if (name && name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tên khách hàng không được để trống'
    });
  }

  if (phone && phone.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không được vượt quá 20 ký tự'
    });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email không hợp lệ'
    });
  }

  next();
};

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateProductCreate,
  validateProductUpdate,
  validateCustomerCreate,
  validateCustomerUpdate,
  validateOrderCreate,
  validateOrderStatusUpdate,
  validateStockInCreate,
  validateStockInStatusUpdate
};