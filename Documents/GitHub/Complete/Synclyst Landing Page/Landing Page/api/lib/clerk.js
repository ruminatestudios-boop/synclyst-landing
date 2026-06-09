import crypto from 'crypto';

const CLERK_API = 'https://api.clerk.com/v1';

function clerkHeaders() {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) return null;
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

function generatePassword() {
  return crypto.randomBytes(18).toString('base64url');
}

export async function findClerkUserByEmail(email) {
  const headers = clerkHeaders();
  if (!headers) return { error: 'Clerk is not configured' };

  const url = `${CLERK_API}/users?email_address=${encodeURIComponent(email)}&limit=1`;
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => []);

  if (!res.ok) {
    return { error: 'Could not look up account' };
  }

  const users = Array.isArray(data) ? data : data?.data || [];
  return { user: users[0] || null };
}

export async function createClerkUser(email) {
  const headers = clerkHeaders();
  if (!headers) return { error: 'Clerk is not configured', code: 'CONFIG' };

  const password = generatePassword();

  const res = await fetch(`${CLERK_API}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: false,
      public_metadata: {
        signup_source: 'mobile_bridge',
        landing_signup_at: new Date().toISOString(),
      },
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (res.ok) {
    return { user: body, created: true };
  }

  const errors = body?.errors || [];
  const alreadyExists = errors.some((e) =>
    String(e?.code || e?.message || '').toLowerCase().includes('exist') ||
    String(e?.long_message || '').toLowerCase().includes('already')
  );

  if (res.status === 422 && alreadyExists) {
    const lookup = await findClerkUserByEmail(email);
    if (lookup.user) {
      return { user: lookup.user, created: false };
    }
  }

  console.error('[clerk] create user failed', res.status, body);
  return { error: 'Could not create account', code: 'CLERK' };
}

