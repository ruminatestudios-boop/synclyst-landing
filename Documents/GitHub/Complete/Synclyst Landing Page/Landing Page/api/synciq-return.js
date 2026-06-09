import { CHROME_STORE_URL, EMAIL_REGEX } from './lib/constants.js';
import { sendChromeExtensionLinkEmail } from './lib/email.js';
import { logSynciqReturnEmail } from './lib/supabase-log.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const email = String(body?.email || '').trim().toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return res.status(503).json({ error: 'Email delivery is not configured yet. Please try again soon.' });
  }

  try {
    const emailResult = await sendChromeExtensionLinkEmail(email);
    if (emailResult.error) {
      return res.status(502).json({ error: emailResult.error });
    }

    await logSynciqReturnEmail(email);

    return res.status(200).json({
      success: true,
      email,
      chromeStoreUrl: CHROME_STORE_URL,
    });
  } catch (err) {
    console.error('[synciq-return]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
