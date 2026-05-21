const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const DOMAIN = process.env.DOMAIN || 'http://localhost:4200';

async function createCheckoutSession({ bookingId, amountUSD, hotelName, roomName }) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${hotelName} — ${roomName}`,
          },
          unit_amount: Math.round(amountUSD * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId },
    success_url: `${DOMAIN}/dashboard/client?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${DOMAIN}/dashboard/client?payment=cancelled`,
  });

  return { url: session.url, sessionId: session.id };
}

async function verifySession(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    throw new Error(`Payment not completed: ${session.payment_status}`);
  }
  return {
    paymentIntentId: session.payment_intent,
    bookingId: session.metadata.bookingId,
  };
}

async function refundPayment(paymentIntentId) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
  if (refund.status !== 'succeeded') {
    throw new Error(`Refund not succeeded: ${refund.status}`);
  }
  return refund;
}

module.exports = { createCheckoutSession, verifySession, refundPayment };
