// Test simple para verificar que ana.maria@uthh.edu.mx sea válido
console.log('🧪 TEST DE VALIDACIÓN EMAIL: ana.maria@uthh.edu.mx\n');

// Función de validación simplificada basada en nuestras mejoras
function isValidEmail(email) {
  // 1. Formato básico RFC
  const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Formato básico inválido' };
  }
  
  const domain = email.split('@')[1];
  
  // 2. Dominios educativos permitidos
  const educationalDomains = [
    'uthh.edu.mx', 'unam.mx', 'itesm.mx', 'ipn.mx', 'tecnm.mx'
  ];
  
  // 3. Patrones válidos
  const validPatterns = [
    /\.edu\.mx$/,       // .edu.mx
    /\.edu$/,           // .edu
    /\.com$/,           // .com
    /\.org$/,           // .org
    /\.gov$/,           // .gov
    /\.gob\.mx$/,       // .gob.mx
  ];
  
  // 4. Verificar si es válido
  const isDomainValid = educationalDomains.includes(domain) || 
                       validPatterns.some(pattern => pattern.test(domain));
  
  if (!isDomainValid) {
    return { valid: false, reason: 'Dominio no reconocido: ' + domain };
  }
  
  return { valid: true, domain, type: 'educational' };
}

// Lista de emails de prueba
const testEmails = [
  'ana.maria@uthh.edu.mx',        // ✅ Debe pasar
  'profesor.lopez@uthh.edu.mx',   // ✅ Debe pasar  
  'estudiante@unam.mx',           // ✅ Debe pasar
  'usuario@gmail.com',            // ✅ Debe pasar
  '12345678@uthh.edu.mx',         // ✅ Debe pasar (formato anterior)
  'invalid-email',                // ❌ Debe fallar
  'test@invalid-domain.xyz',      // ❌ Debe fallar
];

console.log('📋 RESULTADOS DE VALIDACIÓN:\n');

let passCount = 0;
let failCount = 0;

testEmails.forEach((email, index) => {
  const result = isValidEmail(email);
  const status = result.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
  const info = result.valid ? `(${result.domain})` : `(${result.reason})`;
  
  console.log(`${(index + 1).toString().padStart(2)}. ${email.padEnd(30)} ${status} ${info}`);
  
  if (result.valid) {
    passCount++;
  } else {
    failCount++;
  }
});

console.log(`\n📊 RESUMEN:`);
console.log(`✅ Válidos: ${passCount}`);
console.log(`❌ Inválidos: ${failCount}`);

// Test específico para la maestra
const maestraEmail = 'ana.maria@uthh.edu.mx';
const maestraResult = isValidEmail(maestraEmail);

console.log(`\n🎯 TEST ESPECÍFICO PARA LA MAESTRA:`);
console.log(`📧 Email: ${maestraEmail}`);

if (maestraResult.valid) {
  console.log(`✅ RESULTADO: VÁLIDO`);
  console.log(`🏫 Dominio: ${maestraResult.domain}`);
  console.log(`📝 Tipo: ${maestraResult.type}`);
  console.log(`\n🎉 ¡LA MAESTRA PODRÁ REGISTRARSE EXITOSAMENTE!`);
} else {
  console.log(`❌ RESULTADO: INVÁLIDO`);
  console.log(`🚫 Razón: ${maestraResult.reason}`);
  console.log(`\n⚠️  PROBLEMA DETECTADO - NECESITA CORRECCIÓN`);
}