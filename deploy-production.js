
#!/usr/bin/env node

/**
 * Script de Deploy Seguro para Produção
 * Executa verificações de segurança antes do deploy
 */

const fs = require('fs');
const crypto = require('crypto');

console.log('🔒 Iniciando verificações de segurança para produção...\n');

// 1. Verificar variáveis de ambiente críticas
const requiredEnvVars = [
  'ADMIN_PASSWORD_HASH',
  'STRIPE_SECRET_KEY',
  'DATABASE_URL',
  'ENCRYPTION_SECRET',
  'SESSION_SECRET'
];

console.log('📋 Verificando variáveis de ambiente...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não definidas:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

// 2. Verificar força da senha admin
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
if (!adminPasswordHash || adminPasswordHash.length < 50) {
  console.error('❌ Hash da senha admin muito fraco ou inválido');
  process.exit(1);
}

// 3. Verificar chaves de criptografia
const encryptionSecret = process.env.ENCRYPTION_SECRET;
if (!encryptionSecret || encryptionSecret.length < 32) {
  console.error('❌ Chave de criptografia muito fraca (mínimo 32 caracteres)');
  process.exit(1);
}

// 4. Verificar configuração de produção
if (process.env.NODE_ENV !== 'production') {
  console.error('❌ NODE_ENV deve ser "production"');
  process.exit(1);
}

// 5. Verificar se não estão usando chaves de teste
if (process.env.STRIPE_SECRET_KEY?.includes('test')) {
  console.error('❌ Detectada chave de teste do Stripe em produção');
  process.exit(1);
}

// 6. Gerar relatório de segurança
console.log('\n✅ Todas as verificações passaram!');
console.log('\n📊 Relatório de Segurança:');
console.log(`   🔐 Hash da senha admin: ${adminPasswordHash.slice(0, 10)}...`);
console.log(`   🔑 Chave de criptografia: ${encryptionSecret.slice(0, 8)}...`);
console.log(`   💳 Stripe configurado: ${process.env.STRIPE_SECRET_KEY ? 'Sim' : 'Não'}`);
console.log(`   📧 Email configurado: ${process.env.SMTP_HOST ? 'Sim' : 'Não'}`);
console.log(`   🗄️  Banco configurado: ${process.env.DATABASE_URL ? 'Sim' : 'Não'}`);

console.log('\n🚀 Sistema pronto para deploy em produção!');
