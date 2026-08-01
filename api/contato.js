const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { nome, email, empresa, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  try {
    const { error: dbError } = await supabase
      .from('contatos')
      .insert([{ nome, email, empresa: empresa || null, mensagem }]);

    if (dbError) throw dbError;

    await resend.emails.send({
      from: 'CYKTRA AI <onboarding@resend.dev>',
      to: 'cyktraoficial01@gmail.com',
      subject: `Novo contato: ${nome}`,
      html: `<div style="font-family:sans-serif;padding:32px">
        <h2 style="color:#FF7A00">Novo contato — CYKTRA AI</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Empresa:</strong> ${empresa || '—'}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${mensagem}</p>
      </div>`
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
