export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let email;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    email = body?.email;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, platform: 'landing_page' }),
    });

    const text = await response.text();
    console.log('Supabase status:', response.status, 'body:', text);

    if (response.ok || text.includes('duplicate') || text.includes('unique')) {
      return res.status(200).json({ success: true });
    }

    return res.status(500).json({ error: 'Failed to subscribe', detail: text });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
