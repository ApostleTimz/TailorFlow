const DEFAULT_COUNTRY_CODE = '234';

function normalizePhone(value, countryCode) {
  if (value == null) return null;
  const code = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
  let raw = String(value).trim();
  if (raw.startsWith('00')) raw = `+${raw.slice(2)}`;
  const cleaned = raw.replace(/[^\d+]/g, '');
  let national;
  if (cleaned.startsWith('+')) national = cleaned.slice(1);
  else if (cleaned.startsWith('0')) national = `${code}${cleaned.slice(1)}`;
  else national = `${code}${cleaned}`;
  if (!/^\d{8,15}$/.test(national)) return null;
  return national;
}

function formatMoney(minor, currency) {
  const amount = (Number(minor) || 0) / 100;
  const code = currency || 'NGN';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function formatDueDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'To be confirmed';
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function buildOrderMessage(order, business) {
  const name = String(order.customer?.name || 'there').slice(0, 120);
  const garments = (order.items || [])
    .map((i) => (Number(i.quantity) > 1 ? `${i.quantity} x ${i.garment}` : i.garment))
    .join(', ')
    .slice(0, 1024) || 'your garments';
  const due = formatDueDate(order.dueDate);
  const reference = String(order.reference || '');
  const balanceMinor = Number(order.balanceMinor) || 0;
  if (balanceMinor > 0) {
    const balance = formatMoney(balanceMinor, business?.currency);
    return {
      template: process.env.WHATSAPP_TEMPLATE_NAME || 'order_confirmation',
      parameters: [name, reference, garments, balance, due],
      text: `Hi ${name}, your order ${reference} is confirmed. Garments: ${garments}. Balance: ${balance}. Delivery date: ${due}.`,
    };
  }
  return {
    template: process.env.WHATSAPP_PAID_TEMPLATE_NAME || 'order_paid_confirmation',
    parameters: [name, reference, garments, due],
    text: `Hi ${name}, your order ${reference} is confirmed. Garments: ${garments}. Delivery date: ${due}.`,
  };
}

async function sendOrderNotification(order, business) {
  const { parameters, text, template } = buildOrderMessage(order, business);
  const to = normalizePhone(order.customer?.phone, process.env.WHATSAPP_DEFAULT_COUNTRY_CODE);
  const reference = order.reference;
  if (!to) {
    console.info(`[whatsapp] no usable WhatsApp number for order ${reference}; message not sent`);
    return { sent: false, reason: 'no-phone' };
  }
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV === 'production') console.error(`[whatsapp] delivery is not configured; order ${reference} was not notified`);
    else console.info(`[whatsapp] development preview for ${to}: ${text}`);
    return { sent: false, reason: 'not-configured' };
  }
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' },
        components: [{ type: 'body', parameters: parameters.map((p) => ({ type: 'text', text: p })) }],
      },
    }),
    signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  return { sent: true, messageId: data.messages?.[0]?.id };
}

module.exports = { sendOrderNotification, normalizePhone, buildOrderMessage, formatMoney, formatDueDate };
