const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateOrderCreate, validateOrderStatusUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/customer/:customerId', orderController.getOrdersByCustomer);
router.get('/:id', orderController.getOrderById);
router.post('/', validateOrderCreate, orderController.createOrder);
router.patch('/:id/status', validateOrderStatusUpdate, orderController.updateOrderStatus);
router.delete('/:id/cancel', roleMiddleware(['manager']), orderController.cancelOrder); // ✅ ĐÃ SỬA THỨ TỰ

module.exports = router;