const fs = require('fs');
const path = require('path');

function createMonitor() {
  const eventos = [];
  const stats = {
    total: 0,
    porTipo: {},
    porSeveridade: { baixa: 0, media: 0, alta: 0, critica: 0 },
    porIP: {},
    iniciadoEm: new Date().toISOString(),
  };

  const pastaLogs = path.join(__dirname, 'logs');
  if (!fs.existsSync(pastaLogs)) fs.mkdirSync(pastaLogs, { recursive: true });

  function registrar(evento) {
    const entrada = { ...evento, timestamp: new Date().toISOString(), id: Date.now() };

    eventos.push(entrada);
    if (eventos.length > 1000) eventos.shift();

    stats.total++;
    stats.porTipo[evento.tipo] = (stats.porTipo[evento.tipo] || 0) + 1;
    if (evento.severidade) stats.porSeveridade[evento.severidade]++;
    if (evento.ip) stats.porIP[evento.ip] = (stats.porIP[evento.ip] || 0) + 1;

    const linha = JSON.stringify(entrada) + '\n';
    const arquivo = path.join(pastaLogs, `ataques-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFile(arquivo, linha, () => {});

    if (evento.severidade === 'critica') {
      console.error(`\n🚨 ATAQUE CRÍTICO: ${evento.tipo} | IP: ${evento.ip} | URL: ${evento.url}`);
    } else if (evento.severidade === 'alta') {
      console.warn(`⚠️  ${evento.tipo} | IP: ${evento.ip}`);
    }
  }

  function getStats() {
    const topAtacantes = Object.entries(stats.porIP)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, tentativas: count }));

    return {
      resumo: stats,
      eventosRecentes: eventos.slice(-20).reverse(),
      topAtacantes,
    };
  }

  return { registrar, getStats, eventos };
}

module.exports = { createMonitor };
