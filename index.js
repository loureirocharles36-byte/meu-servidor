const express = require('express');
const helmet = require('helmet');
const { applyWAF, blockedIPs } = require('./waf');
const { createMonitor } = require('./monitor');

const app = express();
const monitor = createMonitor();

app.use(helmet());
applyWAF(app, monitor);

app.get('/security/stats', (req, res) => {
  res.json(monitor.getStats());
});

app.get('/security/blocked', (req, res) => {
  res.json({ blockedIPs: Array.from(blockedIPs) });
});

app.get('/', (req, res) => {
  res.json({ status: 'Servidor rodando com segurança ativa ✅' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de segurança rodando na porta ${PORT}`);
});
