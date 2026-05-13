const SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

function hostFromInput(value: string): string {
  const withoutScheme = value.replace(SCHEME_RE, '');
  if (withoutScheme.startsWith('[')) {
    const end = withoutScheme.indexOf(']');
    return end >= 0 ? withoutScheme.slice(1, end) : withoutScheme;
  }
  return withoutScheme.split(/[/:?#]/, 1)[0] ?? '';
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function allowsHttp(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    (!normalized.includes('.') && normalized.length > 0) ||
    isPrivateIPv4(normalized)
  );
}

export function normalizeSyncServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  const host = hostFromInput(trimmed);
  const withScheme = SCHEME_RE.test(trimmed)
    ? trimmed
    : `${allowsHttp(host) ? 'http' : 'https'}://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (url.protocol === 'http:' && !allowsHttp(url.hostname)) {
      url.protocol = 'https:';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return withScheme;
  }
}
