const nodeCrypto = require('crypto');
module.exports = {
  randomUUID: () => nodeCrypto.randomUUID(),
  getRandomValues: arr => nodeCrypto.getRandomValues(arr),
  digest: async (_alg, data) => nodeCrypto.createHash('sha256').update(Buffer.from(data)).digest().buffer,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
};
