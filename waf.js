const rateLimit = require('express-rate-limit');

const PADROES_SQL = [
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\bDROP\b.*\bTABLE\b)/i,
  /(OR\s+1\s*=\s*1)/i,
  /;\s*(DROP|DELETE|INSERT|UPDATE)/i,
];

const PADROES_XSS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?[^"']+["']?/i,
  /document\s*\.\s*cookie/i,
];

const PADROES_TRAVERSAL = [
  /\.\.\//,
  /etc\/passwd/i,
];

const blockedIPs = new Set();

function detectarAtaque(texto) {
  const str = String(texto);
  for (const p of PADROES_SQL) if (p.test(str)) return { tipo: 'SQL_INJECTION' };
  for (const p of PADROES_XSS) if (p.test(str)) return { tipo: 'XSS' };
  for (const p of PADROES_TRAVERSAL) if (p.test(str)) return { tipo: 'DIRECTORY_TRAVERSAL' };
  return null;
}

function applyWAF(app, monitor) {
  const express = require('express');
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    handler: (req, res) => {
      monitor.registrar({ tipo: 'RATE_LIMIT', ip: req.ip, url: req.url, severidade: 'media' });
      blockedIPs.add(req.ip);
      res.status(429).json({ erro: 'Muitas requisições.' });
    },
  });
  app.use(limiter);

  app.use((req, res, next) => {
    if (blockedIPs.has(req.ip)) {
      monitor.registrar({ tipo: 'IP_BLOQUEADO', ip: req.ip, url: req.url, severidade: 'alta' });
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    next();
  });

  app.use((req, res, next) => {
    const alvos = [req.url, JSON.stringify(req.query), JSON.stringify(req.body || {})];
    for (const alvo of alvos) {
      const ataque = detectarAtaque(alvo);
      if (ataque) {
        monitor.registrar({ tipo: ataque.tipo, ip: req.ip, url: req.url, severidade: 'critica' });
        blockedIPs.add(req.ip);
        return res.status(403).json({ erro: 'Requisição bloqueada.' });
      }
    }
    next();
  });
}

module.exports = { applyWAF, blockedIPs };
