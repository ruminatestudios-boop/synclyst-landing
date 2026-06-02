export async function logMobileSignup(email, meta = {}) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !serviceKey) {
    return { skipped: true };
  }

  const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/waitlist_signups`;

  try {
    const res = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email,
        platform: 'mobile_bridge',
        source: meta.resend ? 'mobile_bridge_resend' : 'mobile_bridge',
        note: meta.created === false ? 'existing_user' : 'new_user',
      }),
    });

    if (res.ok || res.status === 409) {
      return { ok: true };
    }

    const text = await res.text();
    console.warn('[supabase-log] non-fatal error', res.status, text);
    return { ok: false };
  } catch (err) {
    console.warn('[supabase-log] non-fatal exception', err.message);
    return { ok: false };
  }
}

