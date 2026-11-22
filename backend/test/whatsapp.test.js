const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, buildOrderMessage, sendOrderNotification } = require('../src/lib/whatsapp');

const order = {
  reference: 'TF-0001',
  dueDate: '2026-03-12',
  balanceMinor: 1500000,
  customer: { name: 'Ada Okafor', phone: '0803 123 4567' },
  items: [{ garment: 'Kaftan', quantity: 2, priceMinor: 1000000 }],
};

test('customer phone numbers are normalized to E.164 without the plus sign', () => {
  assert.equal(normalizePhone('0803 123 4567'), '2348031234567');
  assert.equal(normalizePhone('+234 (803) 123-4567'), '2348031234567');
  assert.equal(normalizePhone('002348031234567'), '2348031234567');
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone('not a phone'), null);
});

test('order messages carry garments, balance and the delivery date when money is owed', () => {
  const { parameters, text, template } = buildOrderMessage(order, { currency: 'NGN' });
  assert.equal(template, 'order_confirmation');
  assert.deepEqual(parameters, ['Ada Okafor', 'TF-0001', '2 x Kaftan', '₦15,000.00', 'March 12, 2026']);
  assert.match(text, /Garments: 2 x Kaftan/);
  assert.match(text, /Balance: ₦15,000\.00/);
  assert.match(text, /Delivery date: March 12, 2026/);
});

test('fully paid orders omit the balance from the message and use the paid template', () => {
  const { parameters, text, template } = buildOrderMessage({ ...order, balanceMinor: 0 }, { currency: 'NGN' });
  assert.equal(template, 'order_paid_confirmation');
  assert.deepEqual(parameters, ['Ada Okafor', 'TF-0001', '2 x Kaftan', 'March 12, 2026']);
  assert.doesNotMatch(text, /Balance|₦/);
  assert.match(text, /Garments: 2 x Kaftan/);
  assert.match(text, /Delivery date: March 12, 2026/);
  assert.equal(buildOrderMessage({ ...order, balanceMinor: -500 }, { currency: 'NGN' }).template, 'order_paid_confirmation');
});

test('notifications are skipped safely when the provider is not configured', async () => {
  const keys = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
  const saved = keys.map((k) => process.env[k]);
  const originalInfo = console.info;
  console.info = () => {};
  try {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    assert.deepEqual(await sendOrderNotification(order, { currency: 'NGN' }), { sent: false, reason: 'not-configured' });
    assert.deepEqual(await sendOrderNotification({ ...order, customer: { name: 'Ada' } }, { currency: 'NGN' }), { sent: false, reason: 'no-phone' });
  } finally {
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
    console.info = originalInfo;
  }
});

test('notifications post the approved template parameters to the Cloud API', async () => {
  const keys = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TEMPLATE_NAME', 'WHATSAPP_TEMPLATE_LANGUAGE', 'WHATSAPP_API_VERSION'];
  const saved = keys.map((k) => process.env[k]);
  const originalFetch = global.fetch;
  let call;
  try {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';
    process.env.WHATSAPP_TEMPLATE_NAME = 'order_confirmation';
    process.env.WHATSAPP_TEMPLATE_LANGUAGE = 'en_US';
    process.env.WHATSAPP_API_VERSION = 'v21.0';
    global.fetch = async (url, options) => {
      call = { url, options };
      return { ok: true, json: async () => ({ messages: [{ id: 'wamid.1' }] }) };
    };
    const result = await sendOrderNotification(order, { currency: 'NGN' });
    assert.deepEqual(result, { sent: true, messageId: 'wamid.1' });
    assert.equal(call.url, 'https://graph.facebook.com/v21.0/test-phone-id/messages');
    assert.equal(call.options.headers.Authorization, 'Bearer test-token');
    const body = JSON.parse(call.options.body);
    assert.equal(body.messaging_product, 'whatsapp');
    assert.equal(body.to, '2348031234567');
    assert.equal(body.template.name, 'order_confirmation');
    assert.deepEqual(body.template.components[0].parameters.map((p) => p.text), ['Ada Okafor', 'TF-0001', '2 x Kaftan', '₦15,000.00', 'March 12, 2026']);
    await sendOrderNotification({ ...order, balanceMinor: 0 }, { currency: 'NGN' });
    const paidBody = JSON.parse(call.options.body);
    assert.equal(paidBody.template.name, 'order_paid_confirmation');
    assert.deepEqual(paidBody.template.components[0].parameters.map((p) => p.text), ['Ada Okafor', 'TF-0001', '2 x Kaftan', 'March 12, 2026']);
  } finally {
    global.fetch = originalFetch;
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
});
