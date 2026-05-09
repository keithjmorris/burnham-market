/* ═══════════════════════════════════════════════
   BURNHAM MARKET — api/auth-admin.js
   Vercel serverless function to authenticate
   admins against JSONBin
   ═══════════════════════════════════════════════ */

const JSONBIN_API_KEY   = process.env.JSONBIN_API_KEY;
const JSONBIN_ADMINS_BIN = process.env.JSONBIN_ADMINS_BIN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  try {
    const res2 = await fetch(
      `https://api.jsonbin.io/v3/b/${JSONBIN_ADMINS_BIN}/latest`,
      { headers: { 'X-Master-Key': JSONBIN_API_KEY } }
    );
    if (!res2.ok) throw new Error('Failed to fetch admins');
    const data = await res2.json();
    const admins = data.record;

    const admin = admins.find(a =>
      a.username === username &&
      a.password === password &&
      a.bmAdmin === true
    );

    if (admin) {
      return res.status(200).json({
        success: true,
        firstName: admin.firstName,
        lastName: admin.lastName
      });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (err) {
    console.error('auth-admin error:', err);
    return res.status(500).json({ error: err.message });
  }
}