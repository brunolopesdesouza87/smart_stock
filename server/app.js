import express from 'express';
import 'dotenv/config';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.WEBHOOK_SERVER_PORT || 8787);

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'backend',
    mode: 'n8n-only',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[backend] servidor iniciado em http://localhost:${PORT}`);
  console.log('[backend] webhook de pagamentos interno removido (modo n8n-only).');
});
