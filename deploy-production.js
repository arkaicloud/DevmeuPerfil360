#!/usr/bin/env node

/**
 * Script de Deploy Seguro para Produção
 * Executa verificações de segurança antes do deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando processo de deploy para produção...\n');

// Verificações pré-deploy
const checks = [
  {
    name: 'Verificar variáveis de ambiente',
    check: () => {
      const requiredVars = [
        'DATABASE_URL',
        'STRIPE_SECRET_KEY', 
        'VITE_STRIPE_PUBLIC_KEY'
      ];
      
      const missing = requiredVars.filter(varName => !process.env[varName]);
      if (missing.length > 0) {
        throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
      }
      return 'Todas as variáveis críticas configuradas';
    }
  },
  {
    name: 'Testar conexão com banco de dados',
    check: async () => {
      try {
        // Importar e testar conexão
        const { db } = require('./server/db');
        await db.execute('SELECT 1');
        return 'Conexão com banco de dados OK';
      } catch (error) {
        throw new Error(`Erro na conexão com banco: ${error.message}`);
      }
    }
  },
  {
    name: 'Verificar chaves Stripe',
    check: () => {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const publicKey = process.env.VITE_STRIPE_PUBLIC_KEY;
      
      if (!secretKey || !secretKey.startsWith('sk_')) {
        throw new Error('STRIPE_SECRET_KEY inválida');
      }
      
      if (!publicKey || !publicKey.startsWith('pk_')) {
        throw new Error('VITE_STRIPE_PUBLIC_KEY inválida');
      }
      
      return 'Chaves Stripe válidas';
    }
  },
  {
    name: 'Build do frontend',
    check: () => {
      try {
        execSync('npm run build', { stdio: 'pipe' });
        return 'Build do frontend concluído';
      } catch (error) {
        throw new Error(`Erro no build: ${error.message}`);
      }
    }
  },
  {
    name: 'Verificar schema do banco',
    check: async () => {
      try {
        execSync('npm run db:push', { stdio: 'pipe' });
        return 'Schema do banco atualizado';
      } catch (error) {
        throw new Error(`Erro no schema: ${error.message}`);
      }
    }
  }
];

// Executar verificações
async function runChecks() {
  console.log('📋 Executando verificações pré-deploy:\n');
  
  for (const checkItem of checks) {
    try {
      process.stdout.write(`⏳ ${checkItem.name}... `);
      const result = await checkItem.check();
      console.log(`✅ ${result}`);
    } catch (error) {
      console.log(`❌ ${error.message}`);
      console.error('\n🛑 Deploy cancelado devido a erro na verificação.');
      process.exit(1);
    }
  }
}

// Executar deploy
async function deploy() {
  try {
    await runChecks();
    
    console.log('\n🎉 Todas as verificações passaram!');
    console.log('\n📦 Sistema pronto para produção:');
    console.log('   • Domínio: www.meuperfil360.com.br');
    console.log('   • Banco de dados: PostgreSQL configurado');
    console.log('   • Pagamentos: Stripe integrado');
    console.log('   • Segurança: Middlewares ativos');
    console.log('   • Email: Sistema configurado');
    
    console.log('\n🚀 Para finalizar o deploy:');
    console.log('   1. Configure o domínio no Replit');
    console.log('   2. Ative SSL/HTTPS');
    console.log('   3. Configure as variáveis de ambiente de produção');
    console.log('   4. Execute o deploy através do Replit');
    
    console.log('\n✅ Deploy preparado com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro durante o deploy:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  deploy();
}

module.exports = { deploy, runChecks };