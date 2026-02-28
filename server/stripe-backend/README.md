# Stripe Backend para Smart Stock

## Como usar em produção

1. Copie `.env.example` para `.env` e preencha sua chave service_role do Supabase e STRIPE_WEBHOOK_SECRET (pegue no dashboard Stripe > Developers > Webhooks).
2. Instale dependências:
   ```bash
   cd server/stripe-backend
   npm install
   ```
3. Rode o backend em sua hospedagem Node.js (ex: VPS, cloud, etc):
   ```bash
   npm start
   ```
4. Configure o endpoint webhook no Stripe para `https://estoque.r2b.ia.br/webhook`.

## Fluxo
- O frontend chama `/create-checkout-session` para iniciar pagamento.
- Stripe redireciona usuário após pagamento para `https://estoque.r2b.ia.br/`.
- Webhook cria empresa/usuário ou bloqueia/desbloqueia conforme status do pagamento.

## Publicação no GitHub
- Crie um repositório e suba a pasta `server/stripe-backend` e demais arquivos do projeto.
- No servidor, faça `git pull` para baixar as atualizações.
- Mantenha o arquivo `.env` fora do GitHub (adicione ao `.gitignore`).
