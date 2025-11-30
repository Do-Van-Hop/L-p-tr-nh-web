// routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateUserUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.put('/profile', validateUserUpdate, userController.updateProfile);
router.patch('/profile/change-password', userController.changeOwnPassword);

router.get('/', roleMiddleware(['manager']), userController.getAllUsers);
router.post('/', roleMiddleware(['manager']), validateUserUpdate, userController.createUser);
router.get('/:id', roleMiddleware(['manager']), userController.getUserById);
router.put('/:id', roleMiddleware(['manager']), validateUserUpdate, userController.updateUser);
router.delete('/:id', roleMiddleware(['manager']), userController.deleteUser);
router.patch('/:id/change-password', roleMiddleware(['manager']), userController.changePassword);

module.exports = router;