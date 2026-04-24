import { describe, it, expect, beforeEach } from 'vitest';
import { deriveKey, encryptText, decryptText, hasKey, clearKey } from '@/lib/crypto';

describe('Cryptographic Engine (AES-GCM)', () => {
  beforeEach(() => {
    clearKey();
  });

  it('debería derivar una llave exitosamente', async () => {
    await deriveKey('SuperSecreta123!');
    expect(hasKey()).toBe(true);
  });

  it('debería cifrar y descifrar texto correctamente', async () => {
    await deriveKey('PasswordSeguro');
    const textoOriginal = "Verbatim confidencial sobre salud pública";
    
    const textoCifrado = await encryptText(textoOriginal);
    expect(textoCifrado).not.toBe(textoOriginal);
    expect(textoCifrado.includes(':')).toBe(true); // Formato IV:Data

    const textoDescifrado = await decryptText(textoCifrado);
    expect(textoDescifrado).toBe(textoOriginal);
  });

  it('debería rechazar el descifrado si la llave es incorrecta', async () => {
    await deriveKey('PasswordCorrecto');
    const textoCifrado = await encryptText("Secreto");
    
    clearKey();
    
    await deriveKey('PasswordIncorrecto');
    
    // Debería retornar el mensaje de error o fallar
    const resultado = await decryptText(textoCifrado);
    expect(resultado).toContain('Error de descifrado');
  });
});
