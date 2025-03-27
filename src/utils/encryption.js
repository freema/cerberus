/**
 * Encryption and security helper functions
 */
const crypto = require('crypto');
const os = require('os');

/**
 * Get a simple encryption key based on machine-specific info
 * This is not high security but helps avoid storing tokens in plaintext
 * @returns {string} - A 32-character encryption key
 */
function getEncryptionKey() {
  const machineName = os.hostname();
  const userName = os.userInfo().username;
  return crypto.createHash('sha256')
    .update(`${machineName}-${userName}-cerberus`)
    .digest('hex')
    .substring(0, 32);
}

module.exports = {
  getEncryptionKey
};