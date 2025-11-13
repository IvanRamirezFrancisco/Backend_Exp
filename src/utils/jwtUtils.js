const jwt = require('jsonwebtoken');

class JwtUtils {
  // Generar token JWT - equivalente a JwtTokenProvider
  static generateToken(userId, email, roles = []) {
    const payload = {
      userId: userId,
      email: email,
      roles: roles,
      iat: Math.floor(Date.now() / 1000)
    };

    const options = {
      expiresIn: process.env.JWT_EXPIRATION || '24h'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
  }

  // Generar refresh token
  static generateRefreshToken(userId) {
    const payload = {
      userId: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    const options = {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
  }

  // Verificar token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw error;
    }
  }

  // Decodificar token sin verificar (útil para debugging)
  static decodeToken(token) {
    return jwt.decode(token);
  }

  // Verificar si el token ha expirado
  static isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Obtener información del usuario desde el token
  static getUserFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      return {
        userId: decoded.userId,
        email: decoded.email,
        roles: decoded.roles || []
      };
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  // Generar respuesta de autenticación completa
  static generateAuthResponse(user, roles = []) {
    const rolesArray = Array.isArray(roles) ? roles : roles.map(r => r.name || r);
    
    const accessToken = this.generateToken(user.id, user.email, rolesArray);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 86400, // 24 horas en segundos
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        twoFactorEnabled: user.two_factor_enabled || user.twoFactorEnabled,
        googleAuthEnabled: user.google_auth_enabled || user.googleAuthEnabled,
        smsEnabled: user.sms_enabled || user.smsEnabled,
        emailEnabled: user.email_enabled || user.emailEnabled,
        roles: rolesArray
      },
      twoFactorRequired: false
    };
  }

  // Generar respuesta cuando se requiere 2FA
  static generate2FAResponse(user, roles = []) {
    const rolesArray = Array.isArray(roles) ? roles : roles.map(r => r.name || r);
    
    return {
      twoFactorRequired: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        twoFactorEnabled: user.two_factor_enabled || user.twoFactorEnabled,
        googleAuthEnabled: user.google_auth_enabled || user.googleAuthEnabled,
        smsEnabled: user.sms_enabled || user.smsEnabled,
        emailEnabled: user.email_enabled || user.emailEnabled,
        roles: rolesArray
      }
    };
  }

  // Extraer token del header Authorization
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }
}

module.exports = JwtUtils;