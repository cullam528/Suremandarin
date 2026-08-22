import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_AUTHORIZE_URL = `${APPLE_ISSUER}/auth/authorize`;
const APPLE_TOKEN_URL = `${APPLE_ISSUER}/auth/token`;
const appleJwks = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));

type AppleConfig = {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
};

export type AppleIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  privateEmail: boolean;
};

function clean(value: string | undefined) {
  return String(value ?? '').trim();
}

export function getAppleConfig(): AppleConfig | null {
  const clientId = clean(process.env.APPLE_CLIENT_ID);
  const teamId = clean(process.env.APPLE_TEAM_ID);
  const keyId = clean(process.env.APPLE_KEY_ID);
  const privateKey = clean(process.env.APPLE_PRIVATE_KEY).replace(/\\n/g, '\n');
  const frontendUrl = clean(process.env.FRONTEND_URL) || 'http://localhost:3010';
  const redirectUri = clean(process.env.APPLE_REDIRECT_URI)
    || `${frontendUrl.replace(/\/$/, '')}/api/auth/oauth/callback/apple`;
  if (!clientId || !teamId || !keyId || !privateKey || !redirectUri) return null;
  return { clientId, teamId, keyId, privateKey, redirectUri };
}

export function buildAppleAuthorizeUrl(state: string, nonce: string) {
  const config = getAppleConfig();
  if (!config) throw new Error('Apple sign-in is not configured.');
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce,
  });
  return `${APPLE_AUTHORIZE_URL}?${query.toString()}`;
}

async function createAppleClientSecret(config: AppleConfig) {
  const signingKey = await importPKCS8(config.privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setAudience(APPLE_ISSUER)
    .setSubject(config.clientId)
    .setIssuedAt()
    .setExpirationTime('180d')
    .sign(signingKey);
}

export async function exchangeAppleAuthorizationCode(code: string) {
  const config = getAppleConfig();
  if (!config) throw new Error('Apple sign-in is not configured.');
  const clientSecret = await createAppleClientSecret(config);
  const response = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json() as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error_description || payload.error || 'Apple token exchange failed.');
  }
  return payload.id_token;
}

export async function verifyAppleIdentityToken(identityToken: string, expectedNonce?: string) {
  const config = getAppleConfig();
  if (!config) throw new Error('Apple sign-in is not configured.');
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: APPLE_ISSUER,
    audience: config.clientId,
  });
  const email = clean(typeof payload.email === 'string' ? payload.email : '').toLowerCase();
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!payload.sub || !email) throw new Error('Apple did not return an email address.');
  if (!emailVerified) throw new Error('Apple email address is not verified.');
  if (expectedNonce && payload.nonce !== expectedNonce) throw new Error('Apple sign-in nonce mismatch.');
  return {
    subject: payload.sub,
    email,
    emailVerified,
    privateEmail: payload.is_private_email === true || payload.is_private_email === 'true',
  } satisfies AppleIdentity;
}
