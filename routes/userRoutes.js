const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateUserCreate, validateUserUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware(['manager']), userController.getAllUsers);
router.post('/', roleMiddleware(['manager']), validateUserCreate, userController.createUser);

router.get('/:id', userController.getUserById);
router.put('/:id', validateUserUpdate, userController.updateUser);
router.patch('/:id/change-password', userController.changePassword);

router.delete('/:id', roleMiddleware(['manager']), userController.deleteUser);

module.exports = router;