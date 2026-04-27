/**
 * Utilidades Criptográficas para Autenticación Local y Cifrado
 * Utiliza WebCrypto API (AES-GCM con derivación de llave PBKDF2)
 */

// Llave en memoria para uso inmediato
let currentKey: CryptoKey | null = null;

// Sal constante para derivación
const SALT = new TextEncoder().encode('cualidoso-local-salt-v1');

export function hasKey(): boolean {
  if (currentKey !== null) return true;
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('cualidoso_session_key') !== null;
  }
  return false;
}

export function clearKey(): void {
  currentKey = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('cualidoso_session_key');
  }
}

/**
 * Deriva una CryptoKey a partir de una contraseña en texto plano
 */
export async function deriveKey(password: string): Promise<void> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  currentKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Guardamos la contraseña (o una versión de ella) en sessionStorage 
  // para poder reconstruir la llave tras un refresco de página.
  // Esto es más seguro que localStorage porque se borra al cerrar la pestaña.
  sessionStorage.setItem('cualidoso_session_key', password);
}

/**
 * Recupera la llave si existe en la sesión pero no en la memoria (tras un refresco)
 */
async function ensureKey(): Promise<void> {
  if (currentKey) return;
  if (typeof window === 'undefined') return;
  
  const stored = sessionStorage.getItem('cualidoso_session_key');
  if (stored) {
    await deriveKey(stored);
  }
}

/**
 * Cifra un string. Retorna formato: "ivBase64:ciphertextBase64"
 */
export async function encryptText(plainText: string): Promise<string> {
  await ensureKey();
  if (!currentKey) throw new Error('No crypto key available. Please login.');
  if (!plainText) return plainText;

  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    currentKey,
    enc.encode(plainText)
  );

  const ivBase64 = bufferToBase64(iv.buffer);
  const cipherBase64 = bufferToBase64(cipherBuffer);

  return `${ivBase64}:${cipherBase64}`;
}

/**
 * Descifra un string con formato "ivBase64:ciphertextBase64"
 */
export async function decryptText(cipherTextWithIv: string): Promise<string> {
  await ensureKey();
  if (!currentKey) throw new Error('No crypto key available. Please login.');
  if (!cipherTextWithIv || !cipherTextWithIv.includes(':')) return cipherTextWithIv; // No está cifrado

  const [ivBase64, cipherBase64] = cipherTextWithIv.split(':');
  
  try {
    const iv = base64ToBuffer(ivBase64);
    const cipherBuffer = base64ToBuffer(cipherBase64);

    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      currentKey,
      cipherBuffer
    );

    return new TextDecoder().decode(plainBuffer);
  } catch (e) {
    console.error('Error descifrando texto', e);
    return '🔒 [Error de descifrado - Contraseña incorrecta o datos corruptos]';
  }
}

// -- Helpers Base64 <-> ArrayBuffer --

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
