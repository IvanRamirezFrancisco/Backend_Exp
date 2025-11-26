const axios = require('axios');

async function testBackendEmailValidation() {
  console.log('🧪 TEST DE REGISTRO CON EMAIL DE LA MAESTRA\n');
  
  const testUser = {
    firstName: 'Ana María',
    lastName: 'García López',
    email: 'ana.maria@uthh.edu.mx',
    password: 'TestPassword123!',
    phone: '+527771234567'
  };

  console.log('📝 Datos de prueba:');
  console.log(`   👤 Nombre: ${testUser.firstName} ${testUser.lastName}`);
  console.log(`   📧 Email: ${testUser.email}`);
  console.log(`   📱 Teléfono: ${testUser.phone}`);
  
  try {
    console.log('\n🚀 Enviando petición de registro al backend local...');
    
    const response = await axios.post('http://localhost:8080/api/auth/register', testUser, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ REGISTRO EXITOSO!`);
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   📧 Email enviado a: ${testUser.email}`);
    console.log(`   🆔 Usuario ID: ${response.data.data?.user?.id || 'N/A'}`);
    
    console.log('\n🎉 ¡LA VALIDACIÓN DEL BACKEND FUNCIONA CORRECTAMENTE!');
    console.log('   La maestra puede registrarse sin problemas.');
    
    return true;
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ ERROR DE VALIDACIÓN:`);
      console.log(`   📊 Status: ${error.response.status}`);
      console.log(`   🚫 Mensaje: ${error.response.data.message || 'Error desconocido'}`);
      
      if (error.response.data.errors) {
        console.log(`   📋 Errores de validación:`);
        error.response.data.errors.forEach(err => {
          console.log(`      - ${err.msg} (campo: ${err.path})`);
        });
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`⚠️  SERVIDOR NO DISPONIBLE:`);
      console.log(`   🔌 No se pudo conectar a http://localhost:8080`);
      console.log(`   💡 Asegúrate de que el backend esté ejecutándose`);
    } else {
      console.log(`💥 ERROR INESPERADO:`);
      console.log(`   📝 Mensaje: ${error.message}`);
    }
    
    return false;
  }
}

// Ejecutar el test
testBackendEmailValidation().then(success => {
  if (success) {
    console.log('\n✅ TEST COMPLETADO - TODO FUNCIONA CORRECTAMENTE');
  } else {
    console.log('\n❌ TEST FALLIDO - REVISAR CONFIGURACIÓN');
  }
}).catch(error => {
  console.error('\n💥 ERROR FATAL:', error.message);
});