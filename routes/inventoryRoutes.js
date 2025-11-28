const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Tất cả routes yêu cầu đăng nhập
router.use(authMiddleware);
// Chỉ admin mới xem được thống kê tồn kho
router.use(roleMiddleware(['manager']));

// Thống kê tồn kho hiện tại
router.get('/current', inventoryController.getCurrentInventory);

// Thống kê tồn kho tính đến ngày
router.get('/by-date', inventoryController.getInventoryByDate);

// Thống kê sản phẩm sắp hết hàng
router.get('/low-stock', inventoryController.getLowStock);

// Lịch sử xuất nhập kho của sản phẩm
router.get('/product/:product_id/history', inventoryController.getProductInventoryHistory);

module.exports = router;