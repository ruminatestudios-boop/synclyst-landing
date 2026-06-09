import { EMAIL_REGEX } from './lib/constants.js';
import { createClerkUser, findClerkUserByEmail } from './lib/clerk.js';
import { sendDesktopLinkEmail } from './lib/email.js';
import { logMobileSignup } from './lib/supabase-log.js';

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
  const isResend = Boolean(body?.resend);

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!process.env.CLERK_SECRET_KEY?.trim()) {
    return res.status(503).json({ error: 'Account signup is not configured yet. Please try again soon.' });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return res.status(503).json({ error: 'Email delivery is not configured yet. Please try again soon.' });
  }

  try {
    let created = false;
    let user = null;

    if (isResend) {
      const lookup = await findClerkUserByEmail(email);
      if (lookup.error) {
        return res.status(502).json({ error: lookup.error });
      }
      user = lookup.user;
      if (!user) {
        const createdResult = await createClerkUser(email);
        if (createdResult.error) {
          return res.status(502).json({ error: createdResult.error });
        }
        user = createdResult.user;
        created = createdResult.created;
      }
    } else {
      const createdResult = await createClerkUser(email);
      if (createdResult.error) {
        return res.status(502).json({ error: createdResult.error });
      }
      user = createdResult.user;
      created = createdResult.created;
    }

    const emailResult = await sendDesktopLinkEmail(email);
    if (emailResult.error) {
      return res.status(502).json({ error: emailResult.error });
    }

    await logMobileSignup(email, { created, resend: isResend });

    return res.status(200).json({
      success: true,
      email,
      created,
      resent: isResend,
      userId: user?.id || null,
    });
  } catch (err) {
    console.error('[mobile-register]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
