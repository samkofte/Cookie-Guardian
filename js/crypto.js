/* js/crypto.js */

// Convert ArrayBuffer to Hex String
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex String to Uint8Array
function hexToBuffer(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Generate random salt
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(salt);
}

// Derive AES-GCM key from password using PBKDF2
export async function deriveKeyFromPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = hexToBuffer(saltHex);
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 210000, // OWASP recommended minimum for PBKDF2-HMAC-SHA256
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // Extractable so we can store it in chrome.storage.session
    ['encrypt', 'decrypt']
  );
}

// Export a CryptoKey to Hex string
export async function exportKeyToHex(key) {
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToHex(exported);
}

// Import a Hex string to CryptoKey
export async function importKeyFromHex(hex) {
  const buffer = hexToBuffer(hex);
  return await crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

// Save Vault Key to session storage (RAM only, wiped when browser closes)
export async function saveVaultKeyToSession(keyHex) {
  await chrome.storage.session.set({ vaultKey: keyHex });
}

// Get Vault Key from session storage
export async function getVaultKeyFromSession() {
  const result = await chrome.storage.session.get('vaultKey');
  if (result.vaultKey) {
    return await importKeyFromHex(result.vaultKey);
  }
  return null;
}

// Encrypt plaintext string
// Returns { ciphertextHex, ivHex }
export async function encryptData(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    enc.encode(plaintext)
  );
  
  return {
    ciphertextHex: bufferToHex(ciphertextBuffer),
    ivHex: bufferToHex(iv)
  };
}

// Decrypt ciphertext string
// Returns plaintext string
export async function decryptData(ciphertextHex, ivHex, key) {
  const iv = hexToBuffer(ivHex);
  const ciphertext = hexToBuffer(ciphertextHex);
  
  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );
    
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
}
