const http = require('http');
const https = require('https');

const ARQUIVOS_SENSIVEIS = [
  '/.env', '/.git/config', '/wp-config.php',
  '/phpinfo.php', '/backup.zip', '/backup.sql',
];

const HEADERS_OBRIGATORIOS = [
  'x-frame-options',
  'x-content-type-options',
  'strict-transport-security',
  'content-security-policy',
];

function fazerRequisicao(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 4000 }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, headers: res.headers, acessivel: res.statusCode < 400 });
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', headers: {}, acessivel: false }); });
    req.on('error', () => resolve({ status: 'erro', headers: {}, acessivel: false }));
  });
}

async function runScanner(urlBase) {
  console.log(`\n🔍 Iniciando scan em: ${urlBase}\n`);
  const resultado = { vulnerabilidades: [], avisos: [], passaram: [] };

  if (!urlBase.startsWith('https')) {
    resultado.vulnerabilidades.push('❌ CRÍTICO: Site sem HTTPS');
  } else {
    resultado.passaram.push('✅ HTTPS ativo');
  }

  const home = await fazerRequisicao(`${urlBase}/`);
  for (const header of HEADERS_OBRIGATORIOS) {
    if (home.headers[header]) {
      resultado.passaram.push(`✅ Header presente: ${header}`);
    } else {
      resultado.avisos.push(`⚠️  Header ausente: ${header}`);
    }
  }

  for (const caminho of ARQUIVOS_SENSIVEIS) {
    const res = await fazerRequisicao(`${urlBase}${caminho}`);
    if (res.acessivel) {
      resultado.vulnerabilidades.push(`❌ CRÍTICO: Arquivo exposto: ${caminho}`);
    }
  }

  console.log('📊 RESULTADO:');
  resultado.passaram.forEach(m => console.log('  ' + m));
  resultado.avisos.forEach(m => console.log('  ' + m));
  resultado.vulnerabilidades.forEach(m => console.log('  ' + m));
  console.log('');

  return resultado;
}

module.exports = { runScanner };
