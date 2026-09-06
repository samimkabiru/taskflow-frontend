// ─── JWT Payload Decoder (Client-side claim extraction per §0.2) ─────────────

export interface DecodedJwt {
  sub: string;
  email?: string;
  fullName?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decodes the access token payload (middle segment) to extract claims (e.g. `sub` containing user ID).
 * No verification needed — used purely for reading local user claims.
 */
export function decodeJwtPayload(token: string): DecodedJwt | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    
    // Base64Url to Base64
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    
    // Decode Unicode string safely
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload) as DecodedJwt;
  } catch {
    return null;
  }
}
