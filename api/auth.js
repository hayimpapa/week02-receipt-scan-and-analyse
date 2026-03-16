import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const ownerPassword = process.env.OWNER_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!ownerPassword || !sessionSecret) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (!password || password !== ownerPassword) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Generate a self-validating token: uuid.signature
  const uuid = crypto.randomUUID();
  const signature = crypto
    .createHmac('sha256', sessionSecret)
    .update(uuid)
    .digest('hex');

  return res.status(200).json({ token: `${uuid}.${signature}` });
}
