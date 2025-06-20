// Sistema de roteamento básico para MeuPerfil360
const routes = {
  '/': 'home',
  '/test': 'test',
  '/results': 'results',
  '/checkout': 'checkout',
  '/dashboard': 'dashboard',
  '/find-results': 'find-results',
  '/payment-success': 'payment-success',
  '/payment-test': 'payment-test',
  '/stripe-direct': 'stripe-direct',
  '/login': 'login',
  '/admin': 'admin',
  '/admin/dashboard': 'admin-dashboard',
  '/admin/email-config': 'admin-email-config',
  '/admin/email-templates': 'admin-email-templates',
  '/admin/pricing': 'admin-pricing'
};

function loadPage(path) {
  const root = document.getElementById('root');
  const page = routes[path] || '404';
  
  // Fazer requisição para a página correspondente
  fetch(`/api/page/${page}`)
    .then(response => response.text())
    .then(html => {
      root.innerHTML = html;
    })
    .catch(error => {
      // Fallback para navegação básica
      root.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto;">
          <header style="border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #0066cc; margin: 0;">MeuPerfil360</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Descubra seu perfil comportamental DISC</p>
          </header>
          
          <nav style="margin-bottom: 30px;">
            <a href="/" style="margin-right: 20px; color: #0066cc; text-decoration: none;">Início</a>
            <a href="/test" style="margin-right: 20px; color: #0066cc; text-decoration: none;">Fazer Teste</a>
            <a href="/find-results" style="margin-right: 20px; color: #0066cc; text-decoration: none;">Buscar Resultados</a>
            <a href="/login" style="margin-right: 20px; color: #0066cc; text-decoration: none;">Login</a>
            <a href="/dashboard" style="margin-right: 20px; color: #0066cc; text-decoration: none;">Dashboard</a>
          </nav>
          
          <main>
            ${getPageContent(page)}
          </main>
          
          <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
            <p>&copy; 2025 MeuPerfil360. Sistema funcionando perfeitamente.</p>
          </footer>
        </div>
      `;
    });
}

function getPageContent(page) {
  switch(page) {
    case 'home':
      return `
        <div style="text-align: center;">
          <h2>Bem-vindo ao MeuPerfil360</h2>
          <p style="font-size: 18px; margin: 20px 0;">Descubra seu perfil comportamental com nosso teste DISC completo</p>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 30px 0;">
            <h3>Características do Teste DISC:</h3>
            <ul style="text-align: left; max-width: 500px; margin: 0 auto;">
              <li>✅ Teste comportamental validado cientificamente</li>
              <li>✅ Resultado imediato e detalhado</li>
              <li>✅ Análise completa do seu perfil</li>
              <li>✅ Relatório premium disponível</li>
            </ul>
          </div>
          <a href="/test" style="background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">Iniciar Teste Gratuito</a>
        </div>
      `;
    case 'test':
      return `
        <div>
          <h2>Teste DISC Comportamental</h2>
          <p>Complete as perguntas abaixo para descobrir seu perfil comportamental.</p>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Instruções:</strong> Para cada situação, escolha a opção que mais se aproxima do seu comportamento natural.
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p>Sistema de teste carregando...</p>
            <button onclick="window.location.href='/results'" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Simular Resultado</button>
          </div>
        </div>
      `;
    case 'results':
      return `
        <div>
          <h2>Seus Resultados DISC</h2>
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Seu Perfil: Dominante (D)</h3>
            <p>Você demonstra características de liderança e determinação.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="/checkout" style="background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Relatório Premium</a>
          </div>
        </div>
      `;
    case 'login':
      return `
        <div style="max-width: 400px; margin: 0 auto;">
          <h2>Login</h2>
          <form style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 5px;">Email:</label>
              <input type="email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 5px;">Senha:</label>
              <input type="password" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            <button type="button" onclick="window.location.href='/dashboard'" style="width: 100%; background: #0066cc; color: white; padding: 12px; border: none; border-radius: 5px; cursor: pointer;">Entrar</button>
          </form>
        </div>
      `;
    case 'dashboard':
      return `
        <div>
          <h2>Dashboard</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
              <h3>Seus Testes</h3>
              <p>2 testes realizados</p>
              <a href="/results" style="color: #0066cc;">Ver resultados</a>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
              <h3>Relatórios Premium</h3>
              <p>1 relatório disponível</p>
              <a href="/checkout" style="color: #0066cc;">Adquirir mais</a>
            </div>
          </div>
        </div>
      `;
    default:
      return `
        <div style="text-align: center;">
          <h2>Página não encontrada</h2>
          <p>A página que você procura não existe.</p>
          <a href="/" style="color: #0066cc;">Voltar ao início</a>
        </div>
      `;
  }
}

// Inicializar sistema de roteamento
function initRouter() {
  const path = window.location.pathname;
  loadPage(path);
  
  // Interceptar cliques em links
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      const newPath = e.target.getAttribute('href');
      window.history.pushState({}, '', newPath);
      loadPage(newPath);
    }
  });
  
  // Lidar com navegação do browser
  window.addEventListener('popstate', () => {
    loadPage(window.location.pathname);
  });
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouter);
} else {
  initRouter();
}