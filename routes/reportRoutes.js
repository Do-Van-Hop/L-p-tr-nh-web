const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['manager']));

router.get('/sales', reportController.getSalesReport);
router.get('/top-products', reportController.getTopProducts);
router.get('/inventory', reportController.getInventoryReport);

module.exports = router;