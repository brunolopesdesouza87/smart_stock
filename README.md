<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c897d628-43c0-4dd2-a498-cb4dceff15b8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend (n8n-only)

O webhook de pagamentos interno foi removido deste projeto.

- Use o n8n para receber/processar eventos de pagamento.
- O backend local mantém apenas `GET /health` para diagnóstico.

## Run with XAMPP (http://localhost/smart_stock)

1. Build and deploy (local XAMPP flow):
   `npm run deploy:xampp`
2. Keep the generated files in `dist/` and keep `.htaccess` in project root.
3. Apache will serve `/smart_stock` from `dist/index.html` and `/smart_stock/assets/*` from `dist/assets/*`.
4. Make sure Apache is running in XAMPP.
5. Open:
   `http://localhost/smart_stock`

Notes:
- Without running build, Apache cannot execute the TypeScript/TSX source directly.
