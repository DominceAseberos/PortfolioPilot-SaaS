const Stripe = require('stripe');
const stripe = new Stripe('sk_test_51Tgz822dgRFRwNqD9wdER5xA7rmiMkMIMPlyMVwePXF0KsrXGG7NB8mmZYNyycjd8TMv2qFrr3zbKD0JsrqqDtQG00QgexGQO2');

async function test() {
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: 'test@example.com',
      mode: 'subscription',
      line_items: [{ price: 'price_1Th8LS2dgRFRwNqDQlM2Kug2', quantity: 1 }],
      success_url: 'http://localhost:3000/account/billing?success=true',
      cancel_url: 'http://localhost:3000/account/billing?canceled=true',
    });
    console.log("Success:", session.url);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
