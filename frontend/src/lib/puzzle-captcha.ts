import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type PuzzleProof = {
  token?: unknown;
  position?: unknown;
  elapsedMs?: unknown;
  moves?: unknown;
  trap?: unknown;
};

type ChallengePayload = {
  nonce: string;
  target: number;
  issuedAt: number;
  expiresAt: number;
};

type RateEntry = { count: number; resetAt: number };
type SecurityState = {
  consumed: Map<string, number>;
  rates: Map<string, RateEntry>;
};

const globalSecurity = globalThis as typeof globalThis & {
  __sureMandarinSecurity?: SecurityState;
};

const state = globalSecurity.__sureMandarinSecurity ?? {
  consumed: new Map<string, number>(),
  rates: new Map<string, RateEntry>(),
};
globalSecurity.__sureMandarinSecurity = state;

const challengeImages = [
  "/images/captcha/captcha-lantern.png",
  "/images/captcha/captcha-tea.png",
  "/images/captcha/captcha-wall.png",
];

// Vercel deployments must set CAPTCHA_SECRET. This bootstrap value keeps the
// widget available during the first deployment; the environment variable
// should be configured in production and takes precedence automatically.
const bootstrapSecret = "d9415a0d688e9c74d4e2e3fb52fe42cd567f2536e8018d99acf63b188ece42a5";

function secret() {
  const configured = (
    process.env.CAPTCHA_SECRET ??
    process.env.ADMIN_JWT_SECRET ??
    process.env.JWT_SECRET
  );
  if (configured) return configured;
  return bootstrapSecret;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function cleanSecurityState(now = Date.now()) {
  for (const [key, expiresAt] of state.consumed) {
    if (expiresAt <= now) state.consumed.delete(key);
  }
  for (const [key, entry] of state.rates) {
    if (entry.resetAt <= now) state.rates.delete(key);
  }
}

export function createPuzzleChallenge() {
  const now = Date.now();
  cleanSecurityState(now);
  const payload: ChallengePayload = {
    nonce: randomBytes(16).toString("base64url"),
    target: 24 + Math.floor(Math.random() * 63),
    issuedAt: now,
    expiresAt: now + 5 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encoded}.${sign(encoded)}`,
    target: payload.target,
    image: challengeImages[Math.floor(Math.random() * challengeImages.length)],
    expiresIn: 300,
  };
}

export function verifyPuzzleProof(input: PuzzleProof | null | undefined) {
  const now = Date.now();
  cleanSecurityState(now);
  if (!input || String(input.trap ?? "").trim()) return false;
  const token = String(input.token ?? "");
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expected = sign(encoded);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) return false;

  let payload: ChallengePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (
    !payload.nonce ||
    payload.expiresAt < now ||
    payload.issuedAt > now + 5_000 ||
    state.consumed.has(signature)
  ) return false;

  const position = Number(input.position);
  const elapsedMs = Number(input.elapsedMs);
  const moves = Number(input.moves);
  const valid =
    Number.isFinite(position) &&
    Math.abs(position - payload.target) <= 4 &&
    elapsedMs >= 650 &&
    elapsedMs <= 5 * 60 * 1000 &&
    moves >= 3;
  if (valid) state.consumed.set(signature, payload.expiresAt);
  return valid;
}

function requestIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function allowRequest(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  cleanSecurityState(now);
  const key = `${bucket}:${requestIdentity(request)}`;
  const current = state.rates.get(key);
  if (!current || current.resetAt <= now) {
    state.rates.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
