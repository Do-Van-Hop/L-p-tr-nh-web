const Product = require('../models/Product');

const productController = {
  // Lấy danh sách sản phẩm
  getAllProducts: async (req, res) => {
    try {
      const { page, limit, search, category_id, status } = req.query;

      const result = await Product.findAll({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        category_id,
        status
      });

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách sản phẩm'
      });
    }
  },

  // Lấy thông tin sản phẩm bằng ID
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }

      res.json({
        success: true,
        data: { product }
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin sản phẩm'
      });
    }
  },

  // Tạo sản phẩm mới
  createProduct: async (req, res) => {
    try {
      const {
        name, sku, description, category_id, supplier_id, price, cost_price,
        stock_quantity, min_stock, max_stock, status
      } = req.body;

      // Đièu kiện
      if (!name || !category_id || !supplier_id || !price) {
        return res.status(400).json({
          success: false,
          message: 'Tên, danh mục, nhà cung cấp và giá là bắt buộc'
        });
      }

      const productId = await Product.create({
        name,
        sku,
        description,
        category_id,
        supplier_id,
        price,
        cost_price: cost_price || 0,
        stock_quantity: stock_quantity || 0,
        min_stock: min_stock || 0,
        max_stock: max_stock || 100000,
        status: status || 'active'
      });

      res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công',
        data: { product_id: productId }
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo sản phẩm'
      });
    }
  },

  // Cập nhật sản phẩm
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const success = await Product.update(id, updateData);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm để cập nhật'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật sản phẩm thành công'
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật sản phẩm'
      });
    }
  },

  // Xóa sản phẩm
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      const success = await Product.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm để xóa'
        });
      }

      res.json({
        success: true,
        message: 'Xóa sản phẩm thành công'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa sản phẩm'
      });
    }
  },

  // Tìm kiếm sản phẩm
  searchProducts: async (req, res) => {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Query search là bắt buộc'
        });
      }

      const products = await Product.search(q, limit || 10);

      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tìm kiếm sản phẩm'
      });
    }
  },

  // Lấy sản phẩm sắp hết hàng
  getLowStockProducts: async (req, res) => {
    try {
      const products = await Product.getLowStock();

      res.json({
        success: true,
        data: { products },
        total: products.length
      });
    } catch (error) {
      console.error('Get low stock products error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy sản phẩm sắp hết hàng'
      });
    }
  }
};

module.exports = productController;