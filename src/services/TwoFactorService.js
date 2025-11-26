const crypto = require('crypto');
const { User, TwoFactorToken, SmsVerificationCode } = require('../models');
const EmailService = require('./EmailService');
const TextBeltService = require('./TextBeltService');

class TwoFactorService {
  // Generar código aleatorio de 6 dígitos
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Enviar código 2FA por email
  async sendEmailCode(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (!user.email_enabled) {
      throw new Error('2FA por email no está habilitado');
    }

    // Invalidar códigos anteriores usando query directo para evitar problemas con timestamps
    await TwoFactorToken.sequelize.query(
      'UPDATE two_factor_tokens SET used = true, used_at = NOW() WHERE user_id = ? AND token_type = ? AND used = false',
      { 
        replacements: [userId, 'EMAIL'],
        type: TwoFactorToken.sequelize.QueryTypes.UPDATE
      }
    );

    // Generar nuevo código
    const code = this.generateCode();
    console.log(`📝 Generando nuevo código 2FA: ${code} para usuario ${userId}`);
    
    const tokenRecord = await TwoFactorToken.create({
      user_id: userId,
      token: code,
      token_type: 'EMAIL',
      expiry_date: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
      created_at: new Date()
    });
    
    console.log(`💾 Token guardado en BD:`, {
      id: tokenRecord.id,
      token: tokenRecord.token,
      token_type: tokenRecord.token_type,
      expiry_date: tokenRecord.expiry_date
    });

    // Enviar email
    const success = await EmailService.send2FACodeEmail(user.email, user.first_name, code);
    if (!success) {
      throw new Error('Error enviando código 2FA por email');
    }

    return true;
  }

  // Verificar código 2FA por email
  async verifyEmailCode(userId, inputCode) {
    console.log(`🔍 Verificando código email: userId=${userId}, código=${inputCode}`);
    
    const token = await TwoFactorToken.findOne({
      where: {
        user_id: userId,
        token: inputCode,
        token_type: 'EMAIL',
        used: false
      }
    });

    console.log(`🎫 Token encontrado:`, token ? {
      id: token.id,
      token: token.token,
      expiry_date: token.expiry_date,
      used: token.used,
      created_at: token.created_at
    } : 'NO ENCONTRADO');

    if (!token) {
      console.log('❌ Token no encontrado en base de datos');
      return false;
    }

    const isExpired = token.isExpired();
    const isValid = token.isValid();
    
    console.log(`⏰ Token expirado: ${isExpired}, Válido: ${isValid}`);
    console.log(`📅 Fecha actual: ${new Date()}, Fecha expiración: ${token.expiry_date}`);

    if (isExpired || !isValid) {
      console.log('❌ Token expirado o inválido');
      return false;
    }

    // Marcar como usado usando query directo
    console.log('✅ Marcando token como usado...');
    await TwoFactorToken.sequelize.query(
      'UPDATE two_factor_tokens SET used = true, used_at = NOW() WHERE id = ?',
      { 
        replacements: [token.id],
        type: TwoFactorToken.sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('✅ Verificación de email exitosa');
    return true;
  }

  // Enviar código SMS
  async sendSmsCode(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (!user.sms_enabled || !user.phone) {
      throw new Error('SMS 2FA no está habilitado o no hay número de teléfono');
    }

    console.log(`📱 Iniciando envío de SMS 2FA para usuario ${userId}`);

    // Invalidar códigos anteriores usando query directo
    await SmsVerificationCode.sequelize.query(
      'UPDATE sms_verification_codes SET used = true WHERE user_id = ? AND used = false',
      { 
        replacements: [userId],
        type: SmsVerificationCode.sequelize.QueryTypes.UPDATE
      }
    );

    // Generar nuevo código
    const code = this.generateCode();
    console.log(`🔢 Código SMS generado: ${code} para usuario ${userId}`);
    
    // Guardar código en base de datos
    const smsRecord = await SmsVerificationCode.create({
      user_id: userId,
      code: code,
      phone: user.phone,
      expiry_date: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
      created_at: new Date()
    });

    console.log(`💾 Código SMS guardado en BD:`, {
      id: smsRecord.id,
      code: smsRecord.code,
      phone: smsRecord.phone,
      expiry: smsRecord.expiry_date
    });

    // Enviar SMS usando TextBelt
    try {
      const userName = `${user.first_name} ${user.last_name}`.trim() || 'Usuario';
      const success = await TextBeltService.sendVerificationCode(user.phone, code, userName);
      
      if (success) {
        console.log(`✅ SMS enviado exitosamente a ${user.phone} via TextBelt`);
        return true;
      } else {
        throw new Error('Error enviando SMS con TextBelt');
      }
    } catch (error) {
      console.error('❌ Error enviando SMS:', error);
      // Marcar el código como inválido si no se pudo enviar
      await SmsVerificationCode.sequelize.query(
        'UPDATE sms_verification_codes SET used = true WHERE id = ?',
        { 
          replacements: [smsRecord.id],
          type: SmsVerificationCode.sequelize.QueryTypes.UPDATE
        }
      );
      throw new Error(`Error enviando SMS: ${error.message}`);
    }
  }

  // Verificar código SMS
  async verifySmsCode(userId, inputCode) {
    console.log(`🔍 Verificando código SMS: userId=${userId}, código=${inputCode}`);
    
    const smsCode = await SmsVerificationCode.findOne({
      where: {
        user_id: userId,
        code: inputCode,
        used: false
      }
    });

    console.log(`📱 Código SMS encontrado:`, smsCode ? {
      id: smsCode.id,
      code: smsCode.code,
      phone: smsCode.phone,
      expiry_date: smsCode.expiry_date,
      used: smsCode.used,
      created_at: smsCode.created_at
    } : 'NO ENCONTRADO');

    if (!smsCode) {
      console.log('❌ Código SMS no encontrado en base de datos');
      return false;
    }

    const isExpired = smsCode.isExpired();
    const isValid = smsCode.isValid();
    
    console.log(`⏰ SMS expirado: ${isExpired}, Válido: ${isValid}`);
    console.log(`📅 Fecha actual: ${new Date()}, Fecha expiración: ${smsCode.expiry_date}`);

    if (isExpired || !isValid) {
      console.log('❌ Código SMS expirado o inválido');
      return false;
    }

    // Marcar como usado usando query directo
    console.log('✅ Marcando código SMS como usado...');
    await SmsVerificationCode.sequelize.query(
      'UPDATE sms_verification_codes SET used = true WHERE id = ?',
      { 
        replacements: [smsCode.id],
        type: SmsVerificationCode.sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('✅ Verificación de SMS exitosa');
    return true;
  }

  // Habilitar 2FA por email
  async enableEmailTwoFactor(userId) {
    await User.update(
      { 
        email_enabled: true
      },
      { where: { id: userId } }
    );

    // Actualizar el estado general de 2FA
    await this.updateTwoFactorStatus(userId);
  }

  // Habilitar 2FA por SMS
  async enableSmsTwoFactor(userId, phoneNumber) {
    console.log(`📱 Habilitando SMS 2FA para usuario ${userId} con número: ${phoneNumber}`);
    
    // Validar formato de número usando TextBelt
    if (!TextBeltService.isValidPhoneNumber(phoneNumber)) {
      throw new Error('Formato de número de teléfono inválido. Use formato internacional: +1234567890');
    }

    // Limpiar y formatear el número
    const formattedPhone = TextBeltService.cleanPhoneNumber(phoneNumber);

    console.log(`📞 Número formateado: ${formattedPhone}`);

    // Actualizar teléfono y configurar SMS
    await User.update(
      { 
        phone: formattedPhone,
        sms_enabled: false // Se habilitará después de verificar
      },
      { where: { id: userId } }
    );

    // Temporalmente habilitar SMS para poder enviar código de verificación
    await User.update(
      { sms_enabled: true },
      { where: { id: userId } }
    );

    // Enviar código de verificación
    await this.sendSmsCode(userId);

    console.log(`✅ Código de verificación SMS enviado a ${formattedPhone}`);
  }

  // Confirmar configuración SMS
  async confirmSmsTwoFactor(userId, code) {
    const isValid = await this.verifySmsCode(userId, code);
    if (!isValid) {
      throw new Error('Código SMS inválido');
    }

    // Confirmar habilitación
    await User.update(
      { 
        sms_enabled: true
      },
      { where: { id: userId } }
    );

    // Actualizar el estado general de 2FA
    await this.updateTwoFactorStatus(userId);

    return true;
  }

  // Generar o obtener secreto de Google Authenticator
  async generateSecret(userId) {
    console.log('generateSecret called for user:', userId);
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Generar secreto si no existe
    if (!user.google_auth_secret) {
      console.log('Generating new secret for user:', user.email);
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({
        name: `AuthSystem (${user.email})`,
        issuer: process.env.TWO_FACTOR_ISSUER || 'AuthSystem'
      });

      console.log('Generated secret:', secret.base32);
      await User.update(
        { google_auth_secret: secret.base32 },
        { where: { id: userId } }
      );

      return secret.base32;
    }

    console.log('Using existing secret for user');
    return user.google_auth_secret;
  }

  // Habilitar Google Authenticator
  async enableGoogleAuthenticator(userId) {
    console.log('enableGoogleAuthenticator called for user:', userId);
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Generar secreto si no existe
    if (!user.google_auth_secret) {
      console.log('Generating new secret for user:', user.email);
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({
        name: `AuthSystem (${user.email})`,
        issuer: process.env.TWO_FACTOR_ISSUER || 'AuthSystem'
      });

      console.log('Generated secret:', secret.base32);
      await User.update(
        { google_auth_secret: secret.base32 },
        { where: { id: userId } }
      );

      return secret.base32;
    }

    console.log('Using existing secret for user');
    return user.google_auth_secret;
  }

  // Generar QR para Google Authenticator
  async generateQRCode(userId) {
    console.log('Generating QR Code for user:', userId);
    const user = await User.findByPk(userId);
    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User secret exists:', user?.google_auth_secret ? 'Yes' : 'No');
    
    if (!user || !user.google_auth_secret) {
      throw new Error('Secreto de Google Authenticator no encontrado');
    }

    const qrcode = require('qrcode');
    const speakeasy = require('speakeasy');
    
    const otpauthUrl = speakeasy.otpauthURL({
      secret: user.google_auth_secret,
      label: user.email,
      issuer: process.env.TWO_FACTOR_ISSUER || 'AuthSystem',
      encoding: 'base32'
    });

    const qrCodeBuffer = await qrcode.toBuffer(otpauthUrl);
    return qrCodeBuffer.toString('base64');
  }

  // Verificar Google Authenticator (solo para login - no actualiza configuración)
  async verifyGoogleAuthenticator(userId, code) {
    const user = await User.findByPk(userId);
    if (!user || !user.google_auth_secret) {
      throw new Error('Google Authenticator no está configurado para este usuario');
    }

    if (!user.google_auth_enabled) {
      throw new Error('Google Authenticator no está habilitado para este usuario');
    }

    const speakeasy = require('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: user.google_auth_secret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    return isValid;
  }

  // Confirmar Google Authenticator (para configuración inicial - actualiza configuración)
  async confirmGoogleAuthenticator(userId, code) {
    const user = await User.findByPk(userId);
    if (!user || !user.google_auth_secret) {
      throw new Error('Secreto no encontrado');
    }

    const speakeasy = require('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: user.google_auth_secret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!isValid) {
      return false;
    }

    // Habilitar Google Authenticator
    await User.update(
      { 
        google_auth_enabled: true
      },
      { where: { id: userId } }
    );

    // Actualizar el estado general de 2FA
    await this.updateTwoFactorStatus(userId);

    return true;
  }

  // Deshabilitar 2FA
  async disableTwoFactor(userId) {
    await User.update(
      { 
        google_auth_enabled: false,
        sms_enabled: false,
        email_enabled: false,
        google_auth_secret: null
      },
      { where: { id: userId } }
    );

    // Actualizar el estado general de 2FA (debería quedar en false)
    await this.updateTwoFactorStatus(userId);
  }

  // Deshabilitar método específico
  async disableSpecificTwoFactor(userId, method) {
    const updates = {};
    
    switch(method.toLowerCase()) {
      case 'google':
      case 'google_authenticator':
        updates.google_auth_enabled = false;
        updates.google_auth_secret = null;
        break;
      case 'sms':
        updates.sms_enabled = false;
        break;
      case 'email':
        updates.email_enabled = false;
        break;
      default:
        throw new Error('Método 2FA no válido');
    }

    await User.update(updates, { where: { id: userId } });

    // Actualizar el estado general de 2FA
    await this.updateTwoFactorStatus(userId);
  }

  // Actualizar el estado general de 2FA basado en métodos individuales
  async updateTwoFactorStatus(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si al menos un método está habilitado
    const hasAnyMethod = user.google_auth_enabled || user.sms_enabled || user.email_enabled;
    
    // Determinar el tipo principal (el primero que esté activo)
    let primaryType = null;
    if (user.google_auth_enabled) {
      primaryType = 'GOOGLE_AUTHENTICATOR';
    } else if (user.sms_enabled) {
      primaryType = 'SMS';
    } else if (user.email_enabled) {
      primaryType = 'EMAIL';
    }

    await User.update(
      { 
        two_factor_enabled: hasAnyMethod,
        two_factor_type: primaryType
      },
      { where: { id: userId } }
    );

    console.log(`✅ Estado 2FA actualizado para usuario ${userId}: enabled=${hasAnyMethod}, type=${primaryType}`);
  }

  // Obtener métodos 2FA disponibles
  async getAvailableTwoFactorMethods(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      googleAuthenticator: user.google_auth_enabled || false,
      sms: user.sms_enabled || false,
      email: user.email_enabled || false
    };
  }
}

module.exports = new TwoFactorService();