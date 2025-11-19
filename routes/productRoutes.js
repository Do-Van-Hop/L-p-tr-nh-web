const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateProductCreate, validateProductUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProductById);

router.post('/', roleMiddleware(['manager']), validateProductCreate, productController.createProduct);
router.put('/:id', roleMiddleware(['manager']), validateProductUpdate, productController.updateProduct);
router.delete('/:id', roleMiddleware(['manager']), productController.deleteProduct);

module.exports = router;