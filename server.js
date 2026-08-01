const express = require('express');
const helmet = require('helmet');
const { applyWAF, blockedIPs } = require('./waf');
const { createMonitor } = require('./monitor');
const path = require('path');

const app = express();
const monitor = createMonitor();

app.use(helmet());
app.use(express.json());
app.use(applyWAF);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
