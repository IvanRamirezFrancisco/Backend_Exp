const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Role, VerificationToken } = require('../models');
const JwtUtils = require('../utils/jwtUtils');
const EmailService = require('./EmailService');

class AuthService {
  // Registrar usuario - equivalente a Spring Boot
  async registerUser(userData) {
    const { firstName, lastName, email, password } = userData;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const user = await User.create({
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: hashedPassword,
      enabled: false, // Usuario debe verificar email primero
      email_enabled: true // Habilitar 2FA por email por defecto
    });

    // Asignar rol USER por defecto
    const userRole = await Role.findOne({ where: { name: 'ROLE_USER' } });
    if (userRole) {
      await user.addRole(userRole);
    }

    // Generar token de verificación
    const verificationToken = this.generateSecureToken();
    await VerificationToken.create({
      token: verificationToken,
      user_id: user.id
    });

    // Enviar email de verificación
    try {
      await EmailService.sendVerificationEmail(user.email, user.first_name, verificationToken);
      console.log(`✅ Email de verificación enviado a: ${user.email}`);
    } catch (error) {
      console.error('❌ Error enviando email de verificación:', error.message);
      // No fallar el registro si el email no se puede enviar
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      enabled: user.enabled
    };
  }

  // Login de usuario - equivalente a Spring Boot
  async loginUser(email, password) {
    // Buscar usuario
    const user = await User.findOne({ 
      where: { email },
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['name']
      }]
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar si la cuenta está habilitada
    if (!user.enabled) {
      throw new Error('Por favor verifica tu email antes de iniciar sesión');
    }

    // Verificar si está bloqueada
    if (!user.account_non_locked) {
      throw new Error('Cuenta bloqueada. Contacta soporte');
    }

    const roles = user.roles?.map(role => role.name) || ['ROLE_USER'];

    // Si tiene Google Authenticator habilitado, requiere 2FA
    if (user.google_auth_enabled) {
      return JwtUtils.generate2FAResponse(user, roles);
    }

    // Login exitoso sin 2FA
    return JwtUtils.generateAuthResponse(user, roles);
  }

  // Verificar email con token
  async verifyEmailToken(token) {
    const verificationToken = await VerificationToken.findOne({
      where: { 
        token: token,
        used: false 
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!verificationToken) {
      throw new Error('Token de verificación inválido o ya usado');
    }

    if (verificationToken.isExpired()) {
      throw new Error('Token de verificación expirado');
    }

    const user = verificationToken.user;

    // Activar usuario
    await user.update({ enabled: true });

    // Marcar token como usado
    await verificationToken.update({ used: true });

    console.log(`✅ Email verificado exitosamente para: ${user.email}`);
    return true;
  }

  // Reenviar email de verificación
  async resendVerificationEmail(email) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.enabled) {
      throw new Error('El email ya está verificado');
    }

    // Invalidar tokens anteriores
    await VerificationToken.update(
      { used: true },
      { where: { user_id: user.id, used: false } }
    );

    // Generar nuevo token
    const verificationToken = this.generateSecureToken();
    await VerificationToken.create({
      token: verificationToken,
      user_id: user.id
    });

    // Enviar email
    await EmailService.sendVerificationEmail(user.email, user.first_name, verificationToken);
    
    return true;
  }

  // Obtener usuario desde token JWT
  async getUserFromToken(token) {
    try {
      const decoded = JwtUtils.verifyToken(token);
      const user = await User.findByPk(decoded.userId, {
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['name']
        }]
      });

      if (!user || !user.enabled) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        twoFactorEnabled: user.two_factor_enabled,
        googleAuthEnabled: user.google_auth_enabled,
        smsEnabled: user.sms_enabled,
        emailEnabled: user.email_enabled,
        roles: user.roles?.map(role => role.name) || []
      };
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Refresh token
  async refreshToken(refreshToken) {
    try {
      const decoded = JwtUtils.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Token de refresh inválido');
      }

      const user = await User.findByPk(decoded.userId, {
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['name']
        }]
      });

      if (!user || !user.enabled) {
        throw new Error('Usuario no encontrado o deshabilitado');
      }

      const roles = user.roles?.map(role => role.name) || ['ROLE_USER'];
      return JwtUtils.generateAuthResponse(user, roles);
    } catch (error) {
      throw new Error('Token de refresh inválido o expirado');
    }
  }

  // Generar token seguro
  generateSecureToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Generar secreto para Google Authenticator
  generateGoogleAuthSecret(email) {
    // Implementar con speakeasy si se necesita
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({
      name: `AuthSystem (${email})`,
      issuer: process.env.TWO_FACTOR_ISSUER || 'AuthSystem'
    });
    
    return secret.base32;
  }

  // Generar QR para Google Authenticator
  async generateGoogleAuthQrUrl(email, secret) {
    const qrcode = require('qrcode');
    const speakeasy = require('speakeasy');
    
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: email,
      issuer: process.env.TWO_FACTOR_ISSUER || 'AuthSystem',
      encoding: 'base32'
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  }

  // Guardar secreto de Google Auth
  async saveGoogleAuthSecret(userId, secret) {
    await User.update(
      { google_auth_secret: secret },
      { where: { id: userId } }
    );
  }

  // Verificar código de Google Authenticator
  async verifyGoogleAuthCode(userId, code) {
    const user = await User.findByPk(userId);
    if (!user || !user.google_auth_secret) {
      return false;
    }

    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: user.google_auth_secret,
      encoding: 'base32',
      token: code,
      window: 1 // Permitir 30 segundos de desviación
    });
  }

  // Habilitar Google Authenticator
  async enableGoogleAuthForUser(userId) {
    await User.update(
      { 
        google_auth_enabled: true,
        two_factor_enabled: true,
        two_factor_type: 'GOOGLE_AUTHENTICATOR'
      },
      { where: { id: userId } }
    );
  }
}

module.exports = new AuthService();