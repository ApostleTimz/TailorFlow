const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Op } = require('sequelize');
const { sequelize, Business, User } = require('../models');
const { HttpError, wrap, parse, requireAuth, signToken, auditEvent } = require('../middleware');
const { config } = require('../lib/config');
const { passwordSchema } = require('../lib/validation');
const { createToken, createVerificationCode, tokenHash } = require('../lib/tokens');
const { sendAccountEmail, sendVerificationCode } = require('../lib/email');

const r = Router();
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD'];
const PURPOSES = { verify: 'verify_email', reset: 'password_reset' };
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const cookieOpts = { httpOnly: true, sameSite: 'strict', secure: config.production, maxAge: 7 * 24 * 3600 * 1000, path: '/' };
const DUMMY = bcrypt.hashSync('not-a-real-password', 10);

const me = (u) => ({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, business: { id: u.Business.id, name: u.Business.name, currency: u.Business.currency } });
const webBase = () => config.appOrigin;
const emailVerificationRequired = () => config.production || process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
const issueToken = async (user, purpose) => {
  const token = createToken();
  await user.update({ tokenHash: tokenHash(token), tokenExpiresAt: new Date(Date.now() + 3600000), tokenPurpose: purpose });
  return token;
};
const sendVerificationEmail = async (user) => {
  const code = createVerificationCode();
  await user.update({ tokenHash: tokenHash(code), tokenExpiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS), tokenPurpose: PURPOSES.verify });
  await sendVerificationCode(user.email, code);
};
const findByToken = (token, purpose) => User.findOne({ where: {
  tokenHash: tokenHash(token), tokenPurpose: purpose, tokenExpiresAt: { [Op.gt]: new Date() },
} });

const registerSchema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business name.').max(120),
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: passwordSchema,
  currency: z.enum(CURRENCIES).default('NGN'),
});

r.post('/register', wrap(async (req, res) => {
  const d = parse(registerSchema, req.body);
  if (await User.findOne({ where: { email: d.email } })) throw new HttpError(409, 'An account with this email already exists.', { email: 'This email is already registered.' });
  const passwordHash = await bcrypt.hash(d.password, 12);
  const user = await sequelize.transaction(async (transaction) => {
    const business = await Business.create({ name: d.businessName, currency: d.currency }, { transaction });
    return User.create({ businessId: business.id, name: d.name, email: d.email, passwordHash, role: 'owner' }, { transaction });
  });
  await auditEvent(req, 'auth.register', { userId: user.id, businessId: user.businessId, entity: 'user', entityId: user.id });
  if (!emailVerificationRequired()) {
    await user.update({ emailVerifiedAt: new Date() });
    return res.status(201).json({ message: 'Account created. You can sign in now.', emailVerified: true });
  }
  await sendVerificationEmail(user);
  res.status(201).json({ message: 'Check your email for a 6-digit verification code before signing in.', emailVerified: false });
}));

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') });

r.post('/login', wrap(async (req, res) => {
  const d = parse(loginSchema, req.body);
  const user = await User.findOne({ where: { email: d.email }, include: [{ model: Business }] });
  const ok = await bcrypt.compare(d.password, user ? user.passwordHash : DUMMY);
  if (!user || !ok || (emailVerificationRequired() && !user.emailVerifiedAt)) throw new HttpError(401, 'Email or password is incorrect.');
  await auditEvent(req, 'auth.login', { userId: user.id, businessId: user.businessId, entity: 'user', entityId: user.id });
  res.cookie('tf_token', signToken(user), cookieOpts).json(me(user));
}));

r.post('/verify-email', wrap(async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(20).max(200) }), req.body);
  const user = await findByToken(token, PURPOSES.verify);
  if (!user) throw new HttpError(400, 'That verification link is invalid or has expired.');
  await user.update({ emailVerifiedAt: new Date(), tokenHash: null, tokenExpiresAt: null, tokenPurpose: null });
  await auditEvent(req, 'auth.verify_email', { userId: user.id, businessId: user.businessId, entity: 'user', entityId: user.id });
  res.json({ message: 'Email verified. You can now sign in.' });
}));

r.post('/forgot-password', wrap(async (req, res) => {
  const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email().max(254) }), req.body);
  const user = await User.findOne({ where: { email } });
  if (user) {
    const token = await issueToken(user, PURPOSES.reset);
    await auditEvent(req, 'auth.password_reset_requested', { userId: user.id, businessId: user.businessId, entity: 'user', entityId: user.id });
    await sendAccountEmail(email, 'Reset your TailorFlow password', `${webBase()}/reset-password?token=${token}`);
  }
  res.json({ message: 'If that email is registered, a password reset link is on its way.' });
}));

r.post('/reset-password', wrap(async (req, res) => {
  const d = parse(z.object({ token: z.string().min(20).max(200), password: passwordSchema }), req.body);
  const user = await findByToken(d.token, PURPOSES.reset);
  if (!user) throw new HttpError(400, 'That reset link is invalid or has expired.');
  await user.update({ passwordHash: await bcrypt.hash(d.password, 12), tokenHash: null, tokenExpiresAt: null, tokenPurpose: null });
  await user.increment('tokenVersion');
  await auditEvent(req, 'auth.password_reset', { userId: user.id, businessId: user.businessId, entity: 'user', entityId: user.id });
  res.json({ message: 'Password reset. You can now sign in.' });
}));

r.post('/logout', (_req, res) => res.clearCookie('tf_token', { ...cookieOpts, maxAge: undefined }).json({ ok: true }));
r.get('/me', requireAuth, (req, res) => res.json(me(req.user)));

r.post('/staff', requireAuth, wrap(async (req, res) => {
  if (req.user.role !== 'owner') throw new HttpError(403, 'Only the business owner can manage staff.');
  const d = parse(z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email().max(254), password: passwordSchema }), req.body);
  if (await User.findOne({ where: { email: d.email } })) throw new HttpError(409, 'An account with this email already exists.');
  const user = await User.create({ businessId: req.businessId, name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12), role: 'staff', emailVerifiedAt: new Date() });
  await auditEvent(req, 'auth.staff_create', { userId: user.id, businessId: req.businessId, entity: 'user', entityId: user.id, meta: { role: 'staff' } });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));
r.get('/staff', requireAuth, wrap(async (req, res) => {
  if (req.user.role !== 'owner') throw new HttpError(403, 'Only the business owner can manage staff.');
  const users = await User.findAll({ where: { businessId: req.businessId }, attributes: ['id', 'name', 'email', 'role', 'emailVerifiedAt'], order: [['createdAt', 'ASC']] });
  res.json({ users });
}));

module.exports = r;
