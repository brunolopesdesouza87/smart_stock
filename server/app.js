import express from 'express';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.WEBHOOK_SERVER_PORT || 8787);

const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'backend',
    mode: 'n8n-only',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/admin/change-password', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Serviço de administração não configurado. Adicione SUPABASE_SERVICE_ROLE_KEY no .env' });
  }
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Dados inválidos. A senha deve ter pelo menos 6 caracteres.' });
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[backend] servidor iniciado em http://localhost:${PORT}`);
  console.log('[backend] webhook de pagamentos interno removido (modo n8n-only).');
});
