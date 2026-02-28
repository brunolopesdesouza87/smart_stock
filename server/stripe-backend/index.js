import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/json' }));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Endpoint para criar sessão Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
  const { email, name, cpf_cnpj } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRODUCT_ID, quantity: 1 }],
      customer_email: email,
      success_url: process.env.REDIRECT_URL + '?success=true',
      cancel_url: process.env.REDIRECT_URL + '?canceled=true',
      metadata: { name, cpf_cnpj }
    });
    res.json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook Stripe
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const name = session.metadata.name;
    const cpf_cnpj = session.metadata.cpf_cnpj;
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;
    // Cria empresa e usuário admin no Supabase
    await supabase.from('organizations').insert({
      name,
      email,
      cpf_cnpj,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      status: 'ativo'
    });
    await supabase.from('profiles').insert({
      email,
      organization_id: null, // Atualize com o id da organização criada
      role: 'admin',
      status: 'ativo'
    });
  }
  if (event.type === 'invoice.payment_failed' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const stripeCustomerId = subscription.customer;
    // Bloqueia empresa no Supabase
    await supabase.from('organizations').update({ status: 'bloqueado' }).eq('stripe_customer_id', stripeCustomerId);
  }
  res.json({ received: true });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe backend rodando na porta ${PORT}`));
