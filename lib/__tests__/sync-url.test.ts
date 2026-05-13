import { normalizeSyncServerUrl } from '@/lib/sync/url';

describe('sync URL normalization', () => {
  it('defaults public hostnames to HTTPS', () => {
    expect(normalizeSyncServerUrl('ovie.dev')).toBe('https://ovie.dev');
    expect(normalizeSyncServerUrl('http://ovie.dev')).toBe('https://ovie.dev');
  });

  it('keeps HTTP for local and private sync targets', () => {
    expect(normalizeSyncServerUrl('localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeSyncServerUrl('100.64.0.10:8000')).toBe('http://100.64.0.10:8000');
    expect(normalizeSyncServerUrl('http://192.168.1.20:3000')).toBe(
      'http://192.168.1.20:3000',
    );
  });

  it('trims surrounding whitespace and trailing slashes', () => {
    expect(normalizeSyncServerUrl('  https://ovie.dev/  ')).toBe('https://ovie.dev');
  });
});
