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

router.post('/', validateProductCreate, productController.createProduct);
router.put('/:id', validateProductUpdate, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;