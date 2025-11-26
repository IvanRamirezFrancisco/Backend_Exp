const axios = require('axios');
require('dotenv').config();

async function testBrevoAPI() {
  console.log('🧪 Iniciando test de conectividad con Brevo API...\n');
  
  const apiKey = process.env.BREVO_API_KEY;
  console.log('🔑 API Key configurada:', apiKey ? 'SÍ (' + apiKey.substring(0, 10) + '...)' : 'NO');
  
  if (!apiKey) {
    console.error('❌ No se encontró BREVO_API_KEY en las variables de entorno');
    return false;
  }

  try {
    // Test 1: Verificar estado de la cuenta
    console.log('📊 Test 1: Verificando estado de la cuenta Brevo...');
    const accountResponse = await axios.get('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ Cuenta Brevo activa:');
    console.log('   - Email:', accountResponse.data.email);
    console.log('   - Plan:', accountResponse.data.plan?.[0]?.type || 'Free');
    console.log('   - Créditos disponibles:', accountResponse.data.plan?.[0]?.credits || 'Unlimited');
    
    // Test 2: Verificar configuración de sender
    console.log('\n📧 Test 2: Verificando senders autorizados...');
    const sendersResponse = await axios.get('https://api.brevo.com/v3/senders', {
      headers: {
        'api-key': apiKey
      }
    });
    
    console.log('✅ Senders disponibles:');
    sendersResponse.data.senders?.forEach(sender => {
      console.log(`   - ${sender.email} (${sender.name}) - Estado: ${sender.active ? 'Activo' : 'Inactivo'}`);
    });

    // Test 3: Envío de email de prueba
    console.log('\n🚀 Test 3: Enviando email de prueba...');
    
    const testEmailData = {
      sender: {
        name: "AuthSystem Test",
        email: process.env.MAIL_USERNAME || "pepemontgomez@gmail.com"
      },
      to: [{ 
        email: "ianyjuan12345@gmail.com", 
        name: "Usuario Test" 
      }],
      subject: "✅ Test de Conectividad - AuthSystem",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #007bff;">🎉 Test Exitoso!</h2>
          <p>Este es un email de prueba para verificar que Brevo está funcionando correctamente.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Estado API:</strong> ✅ Conectado</p>
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>✅ Tu configuración de email está funcionando perfectamente!</strong>
          </div>
        </div>
      `,
      textContent: "Test de conectividad AuthSystem - Email enviado correctamente"
    };

    const emailResponse = await axios.post('https://api.brevo.com/v3/smtp/email', testEmailData, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      timeout: 30000
    });

    console.log('✅ Email de prueba enviado exitosamente!');
    console.log('   - Message ID:', emailResponse.data.messageId);
    console.log('   - Status:', emailResponse.status);
    
    console.log('\n🎊 TODOS LOS TESTS PASARON - BREVO ESTÁ FUNCIONANDO CORRECTAMENTE');
    return true;

  } catch (error) {
    console.error('\n❌ Error en test de Brevo:');
    
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Error:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('\n🚨 PROBLEMA: API Key inválida o expirada');
        console.error('💡 SOLUCIÓN: Necesitas generar una nueva API key en Brevo');
      } else if (error.response.status === 400) {
        console.error('\n🚨 PROBLEMA: Datos de email inválidos o sender no autorizado');
      }
    } else {
      console.error('   - Message:', error.message);
    }
    
    return false;
  }
}

// Ejecutar el test
testBrevoAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});