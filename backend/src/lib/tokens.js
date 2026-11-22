const crypto = require('crypto');
const createToken = () => crypto.randomBytes(32).toString('hex');
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
module.exports = { createToken, tokenHash };
