export interface JwtParsedResult {
  ok: boolean;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  signature?: string;
  isExpired?: boolean;
  issuedAt?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Decodes a Base64URL string safely in browser environment.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
}

/**
 * Inspects and parses a JSON Web Token (JWT).
 */
export function parseJwt(token: string): JwtParsedResult {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: 'Empty token string' };
  }

  const parts = cleanToken.split('.');
  if (parts.length !== 3) {
    return { ok: false, error: 'Invalid JWT format (expected 3 dot-separated parts: Header.Payload.Signature)' };
  }

  try {
    const headerJson = JSON.parse(base64UrlDecode(parts[0]));
    const payloadJson = JSON.parse(base64UrlDecode(parts[1]));
    const signature = parts[2];

    let isExpired: boolean | undefined;
    let issuedAt: string | undefined;
    let expiresAt: string | undefined;

    if (payloadJson && typeof payloadJson === 'object') {
      if (typeof payloadJson.exp === 'number') {
        const expDate = new Date(payloadJson.exp * 1000);
        expiresAt = expDate.toISOString();
        isExpired = expDate.getTime() < Date.now();
      }
      if (typeof payloadJson.iat === 'number') {
        issuedAt = new Date(payloadJson.iat * 1000).toISOString();
      }
    }

    return {
      ok: true,
      header: headerJson,
      payload: payloadJson,
      signature,
      isExpired,
      issuedAt,
      expiresAt,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Failed to decode JWT: ${err.message}` : 'Failed to decode Base64 payload',
    };
  }
}
