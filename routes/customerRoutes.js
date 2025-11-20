const express = require('express');
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateCustomerCreate, validateCustomerUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', customerController.getAllCustomers);
router.get('/search', customerController.searchCustomers);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/purchase-history', customerController.getPurchaseHistory);
router.get('/:id/purchase-stats', customerController.getPurchaseStats);

router.post('/', roleMiddleware(['manager']), validateCustomerCreate, customerController.createCustomer);
router.put('/:id', roleMiddleware(['manager']), validateCustomerUpdate, customerController.updateCustomer);
router.delete('/:id', roleMiddleware(['manager']), customerController.deleteCustomer);

router.patch('/:id/loyalty-points', customerController.updateLoyaltyPoints);

module.exports = router;