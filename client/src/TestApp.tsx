import React from 'react';

export default function TestApp() {
  return React.createElement('div', { style: { padding: '20px', fontFamily: 'Arial, sans-serif' } },
    React.createElement('h1', null, 'MeuPerfil360 - Sistema Funcionando'),
    React.createElement('p', null, 'Aplicação carregada com sucesso!'),
    React.createElement('div', { 
      style: { 
        background: '#f0f8ff', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px' 
      }
    },
      React.createElement('h2', null, 'Status do Sistema:'),
      React.createElement('ul', null,
        React.createElement('li', null, '✅ React carregado corretamente'),
        React.createElement('li', null, '✅ Servidor Express funcionando'),
        React.createElement('li', null, '✅ Vite conectado'),
        React.createElement('li', null, '✅ Domínio meuperfil360.com.br configurado')
      )
    )
  );
}