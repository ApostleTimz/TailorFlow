const crypto = require('crypto');
const createToken = () => crypto.randomBytes(32).toString('hex');
const createVerificationCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
module.exports = { createToken, createVerificationCode, tokenHash };
