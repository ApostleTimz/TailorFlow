const { z } = require('zod');

const COMMON_PASSWORDS = new Set([
  'password', 'password123', 'password1234', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'abc123456', 'letmein123', 'welcome123', 'admin12345',
  'iloveyou123', '111111111', '000000000', '123123123', 'tailorflow', 'derivatives',
]);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.').refine((v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= '2000-01-01' && v <= '2100-12-31';
}, 'Choose a valid date between 2000 and 2100.');

const optionalDate = dateString.nullable().optional().or(z.literal('')).transform((v) => v || null);

const phoneSchema = z.string().trim().max(30).refine((v) => {
  if (!v) return true;
  const digits = (v.match(/\d/g) || []).length;
  return /^\+?[0-9 ()-]+$/.test(v) && digits >= 7 && digits <= 15;
}, 'Enter a valid phone or WhatsApp number.').optional().nullable().transform((v) => v || null);

const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(72, 'Use 72 characters or fewer.')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Use 72 bytes or fewer.')
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase().trim()), 'Choose a less common password.');

const calendarRange = z.object({ start: dateString, end: dateString }).superRefine((v, ctx) => {
  if (v.start > v.end) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start'], message: 'Start date must be before the end date.' });
  if ((Date.parse(v.end) - Date.parse(v.start)) / 864e5 > 366) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end'], message: 'Choose a range of one year or less.' });
});

const escapeLike = (value) => String(value).replace(/[\\%_]/g, '\\$&');

module.exports = { dateString, optionalDate, phoneSchema, passwordSchema, calendarRange, escapeLike };
