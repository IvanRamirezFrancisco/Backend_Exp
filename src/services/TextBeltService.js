const axios = require('axios');

class TextBeltService {
  constructor() {
    this.apiKey = process.env.TEXTBELT_API_KEY;
    this.baseUrl = 'https://textbelt.com/text';
    
    if (!this.apiKey) {
      throw new Error('TextBelt API Key no configurada. Configura TEXTBELT_API_KEY en .env');
    }
    
    console.log('📱 TextBelt SMS Service inicializado correctamente');
    console.log('🔑 API Key configurada:', this.apiKey ? '✅ Presente' : '❌ Faltante');
  }

  /**
   * Enviar SMS usando TextBelt API
   * @param {string} phoneNumber - Número de teléfono en formato internacional (+1234567890)
   * @param {string} message - Mensaje a enviar
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendSms(phoneNumber, message) {
    try {
      console.log(`📤 Enviando SMS via TextBelt:`);
      console.log(`   - Destino: ${phoneNumber}`);
      console.log(`   - Mensaje: ${message.substring(0, 50)}...`);
      
      // Limpiar el número de teléfono
      const cleanNumber = this.cleanPhoneNumber(phoneNumber);
      
      // Validar formato del número
      if (!this.isValidPhoneNumber(cleanNumber)) {
        throw new Error(`Formato de número de teléfono inválido: ${phoneNumber}`);
      }

      // Preparar datos para TextBelt API
      const requestData = {
        phone: cleanNumber,
        message: message,
        key: this.apiKey
      };

      console.log(`📞 Enviando a TextBelt API: ${cleanNumber}`);
      
      // Realizar petición a TextBelt
      const response = await axios.post(this.baseUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AuthSystem-SMS/1.0'
        },
        timeout: 10000 // 10 segundos de timeout
      });

      console.log('📊 Respuesta TextBelt:', response.data);

      // Verificar si el envío fue exitoso
      if (response.data.success) {
        console.log(`✅ SMS enviado exitosamente via TextBelt:`);
        console.log(`   - ID Mensaje: ${response.data.textId}`);
        console.log(`   - Destino: ${cleanNumber}`);
        console.log(`   - Cuota restante: ${response.data.quotaRemaining || 'N/A'}`);
        console.log(`   - Tiempo: ${new Date().toISOString()}`);
        
        return {
          success: true,
          messageId: response.data.textId,
          quotaRemaining: response.data.quotaRemaining,
          phone: cleanNumber
        };
      } else {
        // Manejar errores específicos de TextBelt
        const errorMessage = this.getTextBeltError(response.data.error);
        console.error(`❌ Error TextBelt: ${errorMessage}`);
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ Error enviando SMS con TextBelt:', error);
      
      // Si es error de red o timeout
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        throw new Error('Error de conexión con el servicio SMS. Inténtalo más tarde.');
      }
      
      // Si es error HTTP
      if (error.response) {
        console.error('   - Status HTTP:', error.response.status);
        console.error('   - Respuesta:', error.response.data);
        throw new Error('Error del servicio SMS. Verifica la configuración.');
      }
      
      // Re-lanzar el error si ya tiene un mensaje específico
      throw error;
    }
  }

  /**
   * Enviar código SMS de verificación
   * @param {string} phoneNumber - Número de teléfono
   * @param {string} code - Código de verificación
   * @param {string} userName - Nombre del usuario (opcional)
   * @returns {Promise<boolean>} - true si se envió exitosamente
   */
  async sendVerificationCode(phoneNumber, code, userName = 'Usuario') {
    try {
      // Crear mensaje personalizado y profesional
      const message = `Hola ${userName}! Tu código de verificación es: ${code}. Este código expira en 5 minutos.`;

      const result = await this.sendSms(phoneNumber, message);
      
      return result.success;

    } catch (error) {
      console.error('❌ Error enviando código de verificación:', error);
      throw error;
    }
  }

  /**
   * Limpiar formato de número de teléfono
   * @param {string} phoneNumber - Número con posibles espacios y caracteres
   * @returns {string} - Número limpio
   */
  cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Número de teléfono requerido');
    }
    
    // Remover todos los espacios, guiones, paréntesis y puntos
    const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    console.log(`📱 Número limpiado: "${phoneNumber}" -> "${cleaned}"`);
    return cleaned;
  }

  /**
   * Validar formato de número de teléfono internacional
   * @param {string} phoneNumber - Número a validar
   * @returns {boolean} - true si es válido
   */
  isValidPhoneNumber(phoneNumber) {
    // TextBelt acepta números en formato internacional (+1234567890)
    // Debe empezar con + seguido de 7-15 dígitos
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    const isValid = phoneRegex.test(phoneNumber);
    
    console.log(`📱 Validación número: "${phoneNumber}" -> ${isValid ? '✅ Válido' : '❌ Inválido'}`);
    
    if (!isValid) {
      console.log('📋 Formato requerido: +[código país][número] (ej: +1234567890)');
    }
    
    return isValid;
  }

  /**
   * Obtener mensaje de error específico de TextBelt
   * @param {string} errorCode - Código de error de TextBelt
   * @returns {string} - Mensaje de error en español
   */
  getTextBeltError(errorCode) {
    const errorMessages = {
      'Out of quota': 'Cuota de SMS agotada. Contacta al administrador.',
      'Invalid phone number': 'Número de teléfono inválido. Usa formato internacional.',
      'Invalid key': 'API Key de TextBelt inválida.',
      'Insufficient funds': 'Fondos insuficientes en la cuenta TextBelt.',
      'Rate limit exceeded': 'Límite de velocidad excedido. Espera un momento.',
      'Invalid message': 'Mensaje inválido o demasiado largo.',
      'Carrier rejected': 'El operador rechazó el mensaje.',
      'Phone number blacklisted': 'Número de teléfono en lista negra.'
    };

    return errorMessages[errorCode] || `Error del servicio SMS: ${errorCode}`;
  }

  /**
   * Verificar estado de la cuenta TextBelt (si es necesario)
   * @returns {Promise<Object>} - Información de la cuenta
   */
  async getAccountStatus() {
    try {
      const response = await axios.post('https://textbelt.com/status', {
        key: this.apiKey
      });

      return {
        quotaRemaining: response.data.quotaRemaining || 0,
        success: response.data.success || false
      };
    } catch (error) {
      console.error('Error verificando estado de cuenta TextBelt:', error);
      return { quotaRemaining: 0, success: false };
    }
  }
}

// Instancia singleton
const textBeltService = new TextBeltService();

module.exports = textBeltService;