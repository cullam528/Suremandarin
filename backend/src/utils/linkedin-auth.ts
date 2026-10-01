export const LINKEDIN_SCOPES = ['openid', 'profile', 'email'];

/** LinkedIn's current OIDC profile endpoint; never trust callback-supplied names/emails. */
export async function linkedinAuthCallback({ accessToken }: { accessToken: string }) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('LinkedIn access token is missing.');
  }

  let response: Response;
  try {
    response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
  } catch {
    throw new Error('Unable to contact LinkedIn. Please try again.');
  }
  if (!response.ok) throw new Error('LinkedIn could not verify this sign-in. Please try again.');

  let profile: Record<string, unknown>;
  try {
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    profile = result as Record<string, unknown>;
  } catch {
    throw new Error('LinkedIn returned an invalid profile.');
  }
  if (typeof profile.sub !== 'string' || !profile.sub.trim()) {
    throw new Error('LinkedIn did not return a valid account identifier.');
  }
  const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
  // Both email and email_verified are optional in LinkedIn's OIDC response.
  // Missing email must fail safely; never invent one or link another provider's account.
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error('LinkedIn did not return an email address. Please sign in with email instead.');
  }
  if (profile.email_verified !== undefined && profile.email_verified !== true) {
    throw new Error('LinkedIn email address is not verified. Please sign in with email instead.');
  }

  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const fullName = (text(profile.name)
    || [text(profile.given_name), text(profile.family_name)].filter(Boolean).join(' ')
    || email.split('@')[0]).slice(0, 255);

  // Strapi's existing providers service owns account creation and duplicate-email checks.
  return {
    username: fullName,
    email,
    fullName,
    displayName: fullName,
    registrationSource: 'linkedin',
    registrationPlatform: 'web',
  };
}
