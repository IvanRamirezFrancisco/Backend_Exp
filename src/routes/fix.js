const express = require('express');
const { User, Role } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Endpoint temporal para asignar rol USER al usuario actual
router.post('/assign-user-role', authenticateToken, async (req, res) => {
  try {
    console.log('Assigning USER role to user:', req.user.id);
    
    // Buscar el rol USER
    const userRole = await Role.findOne({ where: { name: 'USER' } });
    if (!userRole) {
      return res.status(404).json({
        success: false,
        message: 'Role USER not found'
      });
    }

    // Buscar el usuario completo
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Asignar el rol
    await user.addRole(userRole);

    res.json({
      success: true,
      message: 'USER role assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning role'
    });
  }
});

module.exports = router;