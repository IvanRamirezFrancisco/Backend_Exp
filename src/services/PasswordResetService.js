const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, PasswordResetToken } = require('../models');
const EmailService = require('./EmailService');

class PasswordResetService {
  // Solicitar reset de contraseña
  async requestPasswordReset(email, ipAddress = null) {
    try {
      // Verificar límite de intentos (protección anti-spam)
      const rateLimitOk = await this.checkResetRateLimit(email);
      if (!rateLimitOk) {
        // No revelamos que se alcanzó el límite, por seguridad
        return true;
      }

      // Verificar si el usuario existe
      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        this.logSuspiciousActivity(email, 'Email not registered', ipAddress);
        return true; // Siempre devolvemos true por seguridad
      }

      // Verificar si la cuenta está verificada
      if (!user.verified) {
        // Por seguridad, no revelamos el estado de verificación, pero no enviamos email
        this.logSuspiciousActivity(email, 'Account not verified', ipAddress);
        return true; // Siempre devolvemos true por seguridad
      }

      // Invalidar tokens anteriores del usuario
      await PasswordResetToken.update(
        { used: true },
        { where: { user_id: user.id, used: false } }
      );

      // Generar nuevo token seguro
      const token = this.generateSecureToken();

      // Crear y guardar el token
      await PasswordResetToken.create({
        token: token,
        user_id: user.id,
        expiry_date: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
      });

      // Enviar email usando EmailService
      try {
        const emailSent = await EmailService.sendPasswordResetEmail(
          user.email, 
          user.first_name, 
          token
        );

        if (emailSent) {
          console.log(`Token de reset generado y email enviado para: ${email}`);
        } else {
          console.error(`Token generado pero error enviando email para: ${email}`);
        }
      } catch (emailError) {
        console.error(`Error enviando email de reset para ${email}:`, emailError.message);
      }

      return true;

    } catch (error) {
      console.error('Error al procesar solicitud de reset:', error.message);
      return true; // Por seguridad, siempre devolvemos true
    }
  }

  // Registrar intentos sospechosos de password reset para análisis de seguridad
  logSuspiciousActivity(email, reason, ipAddress = null) {
    const timestamp = new Date().toISOString();
    console.warn(`[SECURITY ALERT] ${timestamp} - Password reset attempt: ${reason} | Email: ${email} | IP: ${ipAddress || 'Unknown'}`);
    
    // En producción, esto podría guardarse en una base de datos separada 
    // o enviarse a un sistema de monitoreo de seguridad
    return true;
  }

  // Verificar límite de intentos de reset por email (prevención de spam)
  async checkResetRateLimit(email) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) return true; // Si no existe el usuario, no aplicamos límite

      // Verificar si ya tiene tokens activos recientes (últimos 15 minutos)
      const recentTokens = await PasswordResetToken.count({
        where: {
          user_id: user.id,
          created_at: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 15 * 60 * 1000) // 15 minutos
          }
        }
      });

      // Máximo 3 intentos por email en 15 minutos
      if (recentTokens >= 3) {
        this.logSuspiciousActivity(email, 'Rate limit exceeded - too many reset attempts');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verificando rate limit:', error.message);
      return true; // En caso de error, permitimos el intento
    }
  }

  // Validar token de reset
  async validateResetToken(token) {
    try {
      if (!token || token.trim() === '') {
        return false;
      }

      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: token,
          used: false
        }
      });

      if (!resetToken) {
        console.log(`Token no encontrado o ya usado: ${token}`);
        return false;
      }

      const isExpired = resetToken.isExpired();
      if (isExpired) {
        console.log(`Token expirado: ${token}`);
        return false;
      }

      console.log(`Token válido: ${token}`);
      return true;

    } catch (error) {
      console.error('Error validando token:', error.message);
      return false;
    }
  }

  // Resetear contraseña con token
  async resetPassword(token, newPassword) {
    try {
      // Validar parámetros
      if (!token || token.trim() === '') {
        console.error('Token vacío o nulo');
        return false;
      }

      if (!newPassword || newPassword.trim().length < 8) {
        console.error('Contraseña inválida');
        return false;
      }

      // Buscar token válido
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: token,
          used: false
        },
        include: [{
          model: User,
          as: 'user'
        }]
      });

      if (!resetToken) {
        console.error('Token no encontrado o ya usado');
        return false;
      }

      // Verificar que no haya expirado
      if (resetToken.isExpired()) {
        console.error('Token expirado');
        return false;
      }

      const user = resetToken.user;

      // Actualizar contraseña del usuario
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      await user.update({ password: hashedPassword });

      // Marcar token como usado
      await resetToken.update({ used: true });

      // Log de éxito (opcional enviar notificación)
      console.log(`Contraseña actualizada exitosamente para: ${user.email}`);

      return true;

    } catch (error) {
      console.error('Error al resetear contraseña:', error.message);
      return false;
    }
  }

  // Generar token seguro
  generateSecureToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Obtener información del token (para debugging)
  async getUserByToken(token) {
    try {
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: token,
          used: false
        },
        include: [{
          model: User,
          as: 'user'
        }]
      });

      if (resetToken) {
        return resetToken.user;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo usuario por token:', error.message);
      return null;
    }
  }

  // Limpiar tokens expirados (método de mantenimiento)
  async cleanupExpiredTokens() {
    try {
      const result = await PasswordResetToken.destroy({
        where: {
          expiry_date: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });
      console.log(`${result} tokens expirados limpiados correctamente`);
      return result;
    } catch (error) {
      console.error('Error limpiando tokens expirados:', error.message);
      return 0;
    }
  }

  // Contar tokens activos de un usuario
  async getActiveTokensCount(email) {
    try {
      const user = await User.findOne({ where: { email } });
      if (user) {
        const count = await PasswordResetToken.count({
          where: {
            user_id: user.id,
            used: false,
            expiry_date: {
              [require('sequelize').Op.gt]: new Date()
            }
          }
        });
        return count;
      }
      return 0;
    } catch (error) {
      console.error('Error contando tokens activos:', error.message);
      return 0;
    }
  }

  // Invalidar todos los tokens de un usuario
  async invalidateUserTokens(userId) {
    try {
      await PasswordResetToken.update(
        { used: true },
        { where: { user_id: userId, used: false } }
      );
      console.log(`Tokens invalidados para usuario ID: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error invalidando tokens:', error.message);
      return false;
    }
  }
}

module.exports = new PasswordResetService();