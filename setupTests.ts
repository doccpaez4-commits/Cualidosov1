import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { clearKey } from '@/lib/crypto';

// Setup global crypto for node environment since WebCrypto is available in modern Node 19+ as global crypto
import { webcrypto } from 'crypto';

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    writable: true,
  });

  const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
      getItem(key: string) {
        return store[key] || null;
      },
      setItem(key: string, value: string) {
        store[key] = value.toString();
      },
      clear() {
        store = {};
      },
      removeItem(key: string) {
        delete store[key];
      }
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

beforeEach(() => {
  clearKey();
});
