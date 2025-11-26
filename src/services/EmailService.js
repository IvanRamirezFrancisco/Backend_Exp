const axios = require('axios');

class EmailService {
  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.resendApiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.MAIL_USERNAME || 'pepemontgomez@gmail.com';
  }

  get frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  // Servicio principal de email de verificación - equivalente al de Spring Boot
  async sendVerificationEmail(userEmail, firstName, verificationToken) {
    console.log('📧 Iniciando envío de email de verificación...');
    console.log('🔧 DEBUG EMAIL CONFIG:');
    console.log('📧 Para:', userEmail);
    console.log('🔑 Token:', verificationToken);
    console.log('🌐 Frontend URL:', this.frontendUrl);

    const verificationUrl = `${this.frontendUrl}/verify-account?token=${verificationToken}`;

    try {
      // Intentar con Brevo API primero
      if (this.brevoApiKey) {
        console.log('📤 Intentando envío con Brevo API...');
        const success = await this.sendVerificationWithBrevoAPI(userEmail, firstName, verificationUrl, verificationToken);
        if (success) return true;
      }

      // Fallback a otros proveedores
      if (this.resendApiKey) {
        console.log('📤 Intentando con Resend API como fallback...');
        const success = await this.sendVerificationWithResendAPI(userEmail, firstName, verificationUrl);
        if (success) return true;
      }

      console.error('❌ Todos los proveedores de email fallaron');
      return false;
    } catch (error) {
      console.error('❌ Error general enviando email de verificación:', error.message);
      return false;
    }
  }

  // Envío con Brevo API - copia exacta de Spring Boot
  async sendVerificationWithBrevoAPI(email, firstName, verificationUrl, token) {
    try {
      const startTime = Date.now();
      
      const emailData = {
        sender: {
          name: "AuthSystem - Verificación de Cuenta",
          email: this.fromEmail
        },
        to: [{ email: email, name: firstName }],
        subject: `✅ ${firstName}, confirma tu cuenta en AuthSystem`,
        htmlContent: this.buildVerificationEmailTemplate(firstName, verificationUrl, token),
        textContent: `Hola ${firstName}, confirma tu cuenta en AuthSystem usando este enlace: ${verificationUrl} o este código: ${token}`,
        headers: {
          "X-Mailer": "AuthSystem v1.0",
          "List-Unsubscribe": `<mailto:unsubscribe@authsystem.com>`,
          "X-Priority": "1"
        },
        tags: ["verification", "authentication", "account-setup"]
      };

      console.log('🔧 DEBUG: Brevo API Key presente =', !!this.brevoApiKey);

      const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.brevoApiKey
        },
        timeout: 30000
      });

      const duration = Date.now() - startTime;
      console.log(`📊 Brevo API Response - Status: ${response.status} ${response.statusText}, Body: ${JSON.stringify(response.data)}`);
      console.log(`✅ Email de verificación enviado exitosamente via Brevo API a: ${email} (tiempo: ${duration}ms)`);
      
      return true;
    } catch (error) {
      console.error('❌ Error con Brevo API:', error.response?.data || error.message);
      return false;
    }
  }

  // Template de email de verificación - idéntico al de Spring Boot
  buildVerificationEmailTemplate(firstName, verificationUrl, token) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Cuenta - AuthSystem</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .content { padding: 40px 30px; text-align: center; }
        .welcome { font-size: 18px; color: #2c3e50; margin-bottom: 20px; }
        .message { font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.8; }
        .button {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            margin: 20px 0;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }
        .button:hover { transform: translateY(-2px); }
        .divider { margin: 30px 0; height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); }
        .token {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            text-align: center;
            margin: 25px 0;
            border-radius: 8px;
            border: 2px solid #007bff;
            color: #2c3e50;
            word-break: break-all;
            letter-spacing: 1px;
            font-weight: 600;
        }
        .instructions { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
        .instructions h3 { color: #1976d2; margin-bottom: 10px; font-size: 16px; }
        .instructions p { color: #555; font-size: 14px; }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bienvenido a AuthSystem</h1>
        </div>
        <div class="content">
            <div class="welcome">¡Hola ${firstName}! 👋</div>
            <div class="message">
                Gracias por registrarte en <strong>AuthSystem</strong>. Para completar tu registro y asegurar tu cuenta, necesitamos verificar tu dirección de email.
            </div>
            
            <div class="instructions">
                <h3>🔗 Verificación automática</h3>
                <p>Haz clic en el botón verde para verificar tu cuenta instantáneamente:</p>
            </div>
            <a href="${verificationUrl}" class="button">✅ Verificar mi cuenta ahora</a>
            
            <div class="instructions">
                <h3>⏱️ Información importante</h3>
                <p><strong>Este enlace y código son válidos por 24 horas</strong></p>
                <p>Después de ese tiempo necesitarás solicitar un nuevo código.</p>
            </div>
            
            <div class="warning">
                <strong>🛡️ Seguridad:</strong><br>
                • Si no creaste esta cuenta, simplemente ignora este email<br>
                • Nunca compartas este código con otras personas<br>
                • AuthSystem jamás te pedirá tu contraseña por email
            </div>
        </div>
        <div class="footer">
            <p>Este email fue enviado automáticamente por AuthSystem.</p>
            <p>© 2025 AuthSystem. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Servicio de email 2FA - equivalente al de Spring Boot
  async send2FACodeEmail(userEmail, firstName, code) {
    console.log('📧 Iniciando envío de código 2FA por email...');
    
    try {
      if (this.brevoApiKey) {
        console.log('📤 Intentando envío 2FA con Brevo API...');
        const success = await this.send2FAWithBrevoAPI(userEmail, firstName, code);
        if (success) return true;
      }

      if (this.resendApiKey) {
        console.log('📤 Intentando 2FA con Resend API...');
        const success = await this.send2FAWithResendAPI(userEmail, firstName, code);
        if (success) return true;
      }

      console.error('❌ Todos los proveedores fallaron para 2FA');
      return false;
    } catch (error) {
      console.error('❌ Error enviando código 2FA:', error.message);
      return false;
    }
  }

  // Envío 2FA con Brevo API
  async send2FAWithBrevoAPI(email, firstName, code) {
    try {
      const startTime = Date.now();
      
      const emailData = {
        sender: {
          name: "AuthSystem",
          email: this.fromEmail
        },
        to: [{ email: email, name: firstName }],
        subject: "Código de verificación 2FA - AuthSystem",
        htmlContent: this.build2FAEmailTemplate(firstName, code)
      };

      const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.brevoApiKey
        },
        timeout: 30000
      });

      const duration = Date.now() - startTime;
      console.log(`📊 Brevo API Response - Status: ${response.status} ${response.statusText}, Body: ${JSON.stringify(response.data)}`);
      console.log(`✅ Código 2FA enviado exitosamente via Brevo API a: ${email} (tiempo: ${duration}ms)`);
      
      return true;
    } catch (error) {
      console.error('❌ Error con Brevo API para 2FA:', error.response?.data || error.message);
      return false;
    }
  }

  // Template 2FA - idéntico al de Spring Boot
  build2FAEmailTemplate(firstName, code) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background-color: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; text-align: center; }
        .code {
            background-color: #f1f1f1;
            padding: 15px;
            font-family: monospace;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
            border: 2px solid #667eea;
            color: #333;
        }
        .warning {
            color: #e74c3c;
            font-size: 14px;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Código de Verificación</h1>
        </div>
        <div class="content">
            <h2>Hola ${firstName}</h2>
            <p>Tu código de verificación de dos factores es:</p>

            <div class="code">${code}</div>

            <p>Este código expirará en <strong>5 minutos</strong>.</p>

            <div class="warning">
                <strong>🛡️ Importante:</strong><br>
                Si no solicitaste este código, ignora este email.<br>
                Nunca compartas este código con nadie.
            </div>
        </div>
        <div class="footer">
            <p>Este email fue enviado automáticamente por AuthSystem.</p>
            <p>© 2025 AuthSystem. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Servicio de reseteo de contraseña - equivalente al de Spring Boot
  async sendPasswordResetEmail(userEmail, firstName, resetToken) {
    console.log('📧 Iniciando envío de email de reseteo de contraseña...');
    
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    try {
      if (this.brevoApiKey) {
        console.log('📤 Intentando reseteo con Brevo API...');
        const success = await this.sendPasswordResetWithBrevoAPI(userEmail, firstName, resetUrl, resetToken);
        if (success) return true;
      }

      console.error('❌ Error enviando email de reseteo');
      return false;
    } catch (error) {
      console.error('❌ Error general en reseteo de contraseña:', error.message);
      return false;
    }
  }

  // Envío de reseteo con Brevo API
  async sendPasswordResetWithBrevoAPI(email, firstName, resetUrl, token) {
    try {
      const startTime = Date.now();
      
      const emailData = {
        sender: {
          name: "AuthSystem Security",
          email: this.fromEmail
        },
        to: [{ email: email, name: firstName }],
        subject: "Recuperación de contraseña - AuthSystem",
        htmlContent: this.buildPasswordResetEmailTemplate(firstName, resetUrl, token)
      };

      const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.brevoApiKey
        },
        timeout: 30000
      });

      const duration = Date.now() - startTime;
      console.log(`📊 Brevo API Response (Reset Password) - Status: ${response.status} ${response.statusText}, Body: ${JSON.stringify(response.data)}`);
      console.log(`✅ Email de reseteo de contraseña enviado exitosamente via Brevo API a: ${email} (tiempo: ${duration}ms)`);
      
      return true;
    } catch (error) {
      console.error('❌ Error con Brevo API para reseteo:', error.response?.data || error.message);
      return false;
    }
  }

  // Template de reseteo - idéntico al de Spring Boot
  buildPasswordResetEmailTemplate(firstName, resetUrl, token) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; text-align: center; }
        .button {
            background-color: #e74c3c;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
        }

        .warning {
            color: #e74c3c;
            font-size: 14px;
            margin-top: 20px;
            background-color: #ffe6e6;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #e74c3c;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Recuperación de Contraseña</h1>
        </div>
        <div class="content">
            <h2>Hola ${firstName}</h2>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en AuthSystem.</p>
            
            <p>Para restablecer tu contraseña, haz clic en el siguiente botón:</p>

            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>

            <p><strong>Este enlace expira en 1 hora.</strong></p>

            <div class="warning">
                <strong>🛡️ Importante:</strong><br>
                • Si no solicitaste este restablecimiento, ignora este email.<br>
                • Tu contraseña actual sigue siendo válida hasta que la cambies.<br>
                • Nunca compartas este token con nadie.<br>
                • Si tienes dudas, contacta a nuestro soporte.
            </div>
        </div>
        <div class="footer">
            <p>Este email fue enviado automáticamente por AuthSystem.</p>
            <p>© 2025 AuthSystem. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Fallback con Resend API
  async sendVerificationWithResendAPI(email, firstName, verificationUrl) {
    // Implementación similar con Resend si se necesita
    console.log('🔄 Resend API no implementado aún');
    return false;
  }

  async send2FAWithResendAPI(email, firstName, code) {
    // Implementación similar con Resend si se necesita
    console.log('🔄 Resend API para 2FA no implementado aún');
    return false;
  }
}

module.exports = new EmailService();