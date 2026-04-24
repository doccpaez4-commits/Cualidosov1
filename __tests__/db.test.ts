import { describe, it, expect, beforeEach } from 'vitest';
import "fake-indexeddb/auto";
import { db, addEncryptedMemo } from '@/lib/db';
import { deriveKey, decryptText } from '@/lib/crypto';

describe('Database Integration con Cifrado Transparente', () => {
  beforeEach(async () => {
    await deriveKey('TestPassword_123');
  });

  it('debería guardar un memo cifrado en DB y recuperarlo descifrado', async () => {
    const rawContent = "Reflexión fenomenológica profunda";
    
    const memoId = await addEncryptedMemo({
      projectId: 1,
      annotationId: 10,
      content: rawContent,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Verificamos que a nivel crudo (como lo vería un hacker), esté ilegible
    const rawDbMemo = await db.memos.get(memoId);
    expect(rawDbMemo?.content).not.toBe(rawContent);

    // Verificamos que a través del helper de descifrado, se lea bien
    const cleanContent = await decryptText(rawDbMemo!.content);
    expect(cleanContent).toBe(rawContent);
  });
});
