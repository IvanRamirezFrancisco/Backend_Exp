const express = require('express');
const { body, validationResult } = require('express-validator');
const TwoFactorService = require('../services/TwoFactorService');
const AuthService = require('../services/AuthService');
const JwtUtils = require('../utils/jwtUtils');
const { User } = require('../models');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();

// Helper para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// POST /api/2fa/send-login-code - Enviar código 2FA para login
router.post('/send-login-code', async (req, res) => {
  try {
    const { email, method } = req.body;

    if (!email || !method) {
      return res.status(400).json({
        success: false,
        message: 'Email and method are required'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ 
      where: { email },
      include: ['roles']
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    if (method === 'SMS') {
      if (!user.sms_enabled) {
        return res.status(400).json({
          success: false,
          message: 'SMS 2FA is not enabled for this user'
        });
      }
      await TwoFactorService.sendSmsCode(user.id);
      return res.json({
        success: true,
        message: 'SMS code sent successfully'
      });
    } else if (method === 'EMAIL') {
      if (!user.email_enabled) {
        return res.status(400).json({
          success: false,
          message: 'Email 2FA is not enabled for this user'
        });
      }
      await TwoFactorService.sendEmailCode(user.id);
      return res.json({
        success: true,
        message: 'Email code sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid method. Supported: SMS, EMAIL'
      });
    }

  } catch (error) {
    // Manejo específico para errores de email
    if (error.message.includes('Connection timed out') ||
        error.message.includes('Mail server connection failed')) {
      return res.status(503).json({
        success: false,
        message: 'Error al enviar código 2FA por email. El servidor de correo no está disponible. Por favor, usa SMS como alternativa.'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error al enviar código 2FA: ' + error.message
    });
  }
});

// POST /api/2fa/verify - Verificar código 2FA
router.post('/verify', async (req, res) => {
  try {
    const { email, code, method } = req.body;

    if (!email || !code || !method) {
      return res.status(400).json({
        success: false,
        message: 'Email, code and method are required'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ 
      where: { email },
      include: ['roles']
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    let isValid = false;

    if (method === 'GOOGLE_AUTHENTICATOR') {
      isValid = await TwoFactorService.verifyGoogleAuthenticator(user.id, code);
    } else if (method === 'EMAIL') {
      isValid = await TwoFactorService.verifyEmailCode(user.id, code);
    } else if (method === 'SMS') {
      isValid = await TwoFactorService.verifySmsCode(user.id, code);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification method. Supported: GOOGLE_AUTHENTICATOR, EMAIL, SMS'
      });
    }

    if (isValid) {
      // Generar respuesta completa con token JWT
      const roles = user.roles?.map(role => role.name) || ['USER'];
      const authResponse = JwtUtils.generateAuthResponse(user, roles);

      res.json({
        success: true,
        message: 'Two-factor authentication successful',
        data: authResponse
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/verify-login - Verificar código 2FA durante login (alias para /verify)
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code, method } = req.body;

    if (!email || !code || !method) {
      return res.status(400).json({
        success: false,
        message: 'Email, code and method are required'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ 
      where: { email },
      include: ['roles']
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    let isValid = false;

    // Normalizar el método para que coincida con los nombres internos
    const normalizedMethod = method.toUpperCase();
    
    if (normalizedMethod === 'GOOGLE_AUTHENTICATOR' || normalizedMethod === 'GOOGLEAUTHENTICATOR') {
      isValid = await TwoFactorService.verifyGoogleAuthenticator(user.id, code);
    } else if (normalizedMethod === 'EMAIL') {
      isValid = await TwoFactorService.verifyEmailCode(user.id, code);
    } else if (normalizedMethod === 'SMS') {
      isValid = await TwoFactorService.verifySmsCode(user.id, code);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification method. Supported: googleAuthenticator, email, sms'
      });
    }

    if (isValid) {
      // Generar respuesta completa con token JWT
      const roles = user.roles?.map(role => role.name) || ['USER'];
      const authResponse = JwtUtils.generateAuthResponse(user, roles);

      res.json({
        success: true,
        message: 'Two-factor authentication successful',
        data: authResponse
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/resend - Reenviar código 2FA durante login
router.post('/resend', async (req, res) => {
  try {
    const { email, method } = req.body;

    if (!email || !method) {
      return res.status(400).json({
        success: false,
        message: 'Email and method are required'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ 
      where: { email },
      include: ['roles']
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Normalizar el método
    const normalizedMethod = method.toUpperCase();

    if (normalizedMethod === 'EMAIL') {
      if (!user.email_enabled) {
        return res.status(400).json({
          success: false,
          message: 'Email 2FA is not enabled for this user'
        });
      }
      await TwoFactorService.sendEmailCode(user.id);
      return res.json({
        success: true,
        message: 'Email verification code sent successfully'
      });
    } else if (normalizedMethod === 'SMS') {
      if (!user.sms_enabled) {
        return res.status(400).json({
          success: false,
          message: 'SMS 2FA is not enabled for this user'
        });
      }
      await TwoFactorService.sendSmsCode(user.id);
      return res.json({
        success: true,
        message: 'SMS verification code sent successfully'
      });
    } else if (normalizedMethod === 'GOOGLE_AUTHENTICATOR' || normalizedMethod === 'GOOGLEAUTHENTICATOR') {
      return res.status(400).json({
        success: false,
        message: 'Google Authenticator does not require code resend. Please use the code from your authenticator app.'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid method. Supported: email, sms'
      });
    }

  } catch (error) {
    console.error('2FA resend error:', error);
    // Manejo específico para errores de email
    if (error.message.includes('Connection timed out') ||
        error.message.includes('Mail server connection failed')) {
      return res.status(503).json({
        success: false,
        message: 'Error al enviar código 2FA por email. El servidor de correo no está disponible temporalmente.'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error al reenviar código 2FA: ' + error.message
    });
  }
});

// === GOOGLE AUTHENTICATOR ENDPOINTS ===

// POST /api/2fa/google/enable - Habilitar Google Authenticator
router.post('/google/enable', authenticateToken, requireUser, async (req, res) => {
  try {
    const secret = await TwoFactorService.enableGoogleAuthenticator(req.user.id);
    
    res.json({
      success: true,
      message: 'Google Authenticator setup initiated. Get QR code from /api/2fa/google/qrcode',
      data: { secret }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/2fa/google/qrcode - Obtener código QR
router.get('/google/qrcode', authenticateToken, requireUser, async (req, res) => {
  try {
    console.log('QR Code endpoint called for user:', req.user.id);
    
    // Primero generar el secreto si no existe
    const secret = await TwoFactorService.generateSecret(req.user.id);
    console.log('Secret generated/retrieved:', secret ? 'Yes' : 'No');
    
    // Luego generar el QR
    const qrCodeBase64 = await TwoFactorService.generateQRCode(req.user.id);
    console.log('QR Code generated:', qrCodeBase64 ? 'Yes' : 'No');
    
    res.json({
      success: true,
      message: 'QR Code and secret generated successfully',
      data: { 
        qrCode: 'data:image/png;base64,' + qrCodeBase64,
        manualEntryKey: secret
      }
    });
  } catch (error) {
    console.error('Error in QR endpoint:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/google/confirm - Confirmar Google Authenticator
router.post('/google/confirm', authenticateToken, requireUser, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const isValid = await TwoFactorService.confirmGoogleAuthenticator(req.user.id, code);

    if (isValid) {
      res.json({
        success: true,
        message: 'Google Authenticator enabled successfully!'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// === EMAIL 2FA ENDPOINTS ===

// POST /api/2fa/email/enable - Habilitar 2FA por email
router.post('/email/enable', authenticateToken, requireUser, async (req, res) => {
  try {
    await TwoFactorService.enableEmailTwoFactor(req.user.id);
    
    res.json({
      success: true,
      message: 'Email 2FA enabled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/email/send - Enviar código por email
router.post('/email/send', authenticateToken, requireUser, async (req, res) => {
  try {
    await TwoFactorService.sendEmailCode(req.user.id);
    
    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/email/verify - Verificar código de email
router.post('/email/verify', authenticateToken, requireUser, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const isValid = await TwoFactorService.verifyEmailCode(req.user.id, code);

    if (isValid) {
      res.json({
        success: true,
        message: 'Email verification successful!'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// === SMS 2FA ENDPOINTS ===

// POST /api/2fa/sms/setup/send-code - Configurar SMS y enviar código
router.post('/sms/setup/send-code', authenticateToken, requireUser, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || phoneNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    await TwoFactorService.enableSmsTwoFactor(req.user.id, phoneNumber);
    
    res.json({
      success: true,
      message: `SMS verification code sent to ${phoneNumber}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/sms/enable-existing - Habilitar SMS 2FA usando número registrado
router.post('/sms/enable-existing', authenticateToken, requireUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verificar que el usuario tenga un número registrado
    if (!user.phone || user.phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'No phone number registered. Please update your phone number first.',
        requiresPhoneUpdate: true
      });
    }

    // Usar el número existente para habilitar SMS 2FA
    await TwoFactorService.enableSmsTwoFactor(req.user.id, user.phone);
    
    res.json({
      success: true,
      message: `SMS verification code sent to ${user.phone}`,
      phoneNumber: user.phone
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/sms/update-phone - Actualizar número de teléfono y habilitar SMS
router.post('/sms/update-phone', authenticateToken, requireUser, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || phoneNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Verificar que el número sea válido
    const TextBeltService = require('../services/TextBeltService');
    if (!TextBeltService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Actualizar el número en el perfil del usuario
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Actualizar número y enviar código de verificación
    const formattedPhone = TextBeltService.cleanPhoneNumber(phoneNumber);
    await user.update({ phone: formattedPhone });
    
    // Habilitar SMS 2FA con el nuevo número
    await TwoFactorService.enableSmsTwoFactor(req.user.id, formattedPhone);
    
    res.json({
      success: true,
      message: `Phone number updated and SMS verification code sent to ${formattedPhone}`,
      phoneNumber: formattedPhone
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/sms/setup/verify-code - Confirmar configuración SMS
router.post('/sms/setup/verify-code', authenticateToken, requireUser, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const isValid = await TwoFactorService.confirmSmsTwoFactor(req.user.id, code);

    if (isValid) {
      res.json({
        success: true,
        message: 'SMS Two-Factor Authentication enabled successfully!'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/sms/send - Enviar código SMS
router.post('/sms/send', authenticateToken, requireUser, async (req, res) => {
  try {
    await TwoFactorService.sendSmsCode(req.user.id);
    
    res.json({
      success: true,
      message: 'SMS verification code sent to your phone'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/sms/verify - Verificar código SMS
router.post('/sms/verify', authenticateToken, requireUser, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const isValid = await TwoFactorService.verifySmsCode(req.user.id, code);

    if (isValid) {
      res.json({
        success: true,
        message: 'SMS verification successful!'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// === GENERAL ENDPOINTS ===

// POST /api/2fa/disable - Deshabilitar toda la 2FA
router.post('/disable', authenticateToken, requireUser, async (req, res) => {
  try {
    await TwoFactorService.disableTwoFactor(req.user.id);
    
    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/2fa/disable/:method - Deshabilitar método específico
router.post('/disable/:method', authenticateToken, requireUser, async (req, res) => {
  try {
    const { method } = req.params;
    await TwoFactorService.disableSpecificTwoFactor(req.user.id, method);
    
    res.json({
      success: true,
      message: `${method} two-factor authentication disabled successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/2fa/status - Obtener estado de 2FA
router.get('/status', authenticateToken, requireUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    const status = {
      enabled: user.two_factor_enabled || false,
      type: user.two_factor_type || 'none',
      hasSecret: !!user.two_factor_secret
    };

    res.json({
      success: true,
      message: 'Two-factor status retrieved',
      data: status
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/2fa/methods - Obtener métodos disponibles
router.get('/methods', authenticateToken, requireUser, async (req, res) => {
  try {
    const methods = await TwoFactorService.getAvailableTwoFactorMethods(req.user.id);
    
    res.json({
      success: true,
      message: 'Available 2FA methods retrieved',
      data: methods
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/2fa/methods/:email - Obtener métodos disponibles por email (para login)
router.get('/methods/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'google_auth_enabled', 'sms_enabled', 'email_enabled', 'two_factor_enabled']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Si no tiene 2FA habilitado, devolver vacío
    if (!user.two_factor_enabled) {
      return res.json({
        success: true,
        message: 'No 2FA methods enabled',
        data: {
          googleAuthenticator: false,
          sms: false,
          email: false
        }
      });
    }

    // Devolver métodos habilitados
    const methods = {
      googleAuthenticator: user.google_auth_enabled || false,
      sms: user.sms_enabled || false,
      email: user.email_enabled || false
    };
    
    res.json({
      success: true,
      message: 'Available 2FA methods retrieved for login',
      data: methods
    });
  } catch (error) {
    console.error('Error getting 2FA methods for login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;