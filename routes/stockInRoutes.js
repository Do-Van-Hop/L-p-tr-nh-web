const express = require('express');
const stockInController = require('../controllers/stockInController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateStockInCreate, validateStockInStatusUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['manager']));

router.get('/', stockInController.getAllStockInOrders);
router.get('/stats', stockInController.getStockInStats);
router.get('/:id', stockInController.getStockInOrderById);
router.post('/', validateStockInCreate, stockInController.createStockInOrder);
router.patch('/:id/status', validateStockInStatusUpdate, stockInController.updateStockInOrderStatus);

module.exports = router;