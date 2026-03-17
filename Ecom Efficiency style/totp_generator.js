/**
 * TOTP Generator - Pure JavaScript Implementation
 * No external dependencies required
 * Based on RFC 6238 (TOTP) and RFC 4226 (HOTP)
 */

(function() {
  'use strict';

  // Base32 decoder
  function base32Decode(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';

    base32 = base32.replace(/=+$/, '').toUpperCase();

    for (let i = 0; i < base32.length; i++) {
      const val = base32Chars.indexOf(base32.charAt(i));
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }

    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const chunk = bits.substr(i, 8);
      hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
    }

    return hex;
  }

  // Convert hex to byte array
  function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  // HMAC-SHA1 implementation
  async function hmacSha1(key, message) {
    const encoder = new TextEncoder();
    const keyData = hexToBytes(key);
    const messageData = new Uint8Array(8);
    
    // Convert counter to bytes (big-endian)
    for (let i = 7; i >= 0; i--) {
      messageData[i] = message & 0xff;
      message = Math.floor(message / 256);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(keyData),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature));
  }

  // Generate TOTP code
  async function generateTOTP(secret, timeStep = 30, digits = 6) {
    try {
      // Remove spaces and convert to uppercase
      secret = secret.replace(/\s+/g, '').toUpperCase();
      
      // Decode base32 secret
      const keyHex = base32Decode(secret);
      
      // Get current time counter
      const epoch = Math.floor(Date.now() / 1000);
      const counter = Math.floor(epoch / timeStep);
      
      // Generate HMAC
      const hmac = await hmacSha1(keyHex, counter);
      
      // Dynamic truncation
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary = 
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
      
      // Generate code
      const otp = binary % Math.pow(10, digits);
      return otp.toString().padStart(digits, '0');
    } catch (error) {
      console.error('[TOTP] Error generating code:', error);
      return null;
    }
  }

  // Calculate time remaining until next code
  function getTimeRemaining(timeStep = 30) {
    const epoch = Math.floor(Date.now() / 1000);
    return timeStep - (epoch % timeStep);
  }

  // Export functions globally
  window.TOTPGenerator = {
    generate: generateTOTP,
    getTimeRemaining: getTimeRemaining
  };

  console.log('[TOTP-GENERATOR] Loaded successfully');
})();

