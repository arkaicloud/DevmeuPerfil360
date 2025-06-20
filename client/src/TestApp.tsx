function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>MeuPerfil360 - Sistema Funcionando</h1>
      <p>Aplicação carregada com sucesso!</p>
      <div style={{ 
        background: '#f0f8ff', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px' 
      }}>
        <h2>Status do Sistema:</h2>
        <ul>
          <li>✅ React carregado corretamente</li>
          <li>✅ Servidor Express funcionando</li>
          <li>✅ Vite conectado</li>
          <li>✅ Domínio meuperfil360.com.br configurado</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;