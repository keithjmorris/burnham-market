/* ═══════════════════════════════════════════════
   BURNHAM MARKET — api/auth-admin.js
   Authenticates admins via Firebase Auth REST API
   ═══════════════════════════════════════════════ */

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: username,
          password: password,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.idToken) {
      // Extract name from email if no display name set
      const emailName = username.split('@')[0];
      const displayName = data.displayName || emailName;
      const nameParts = displayName.split(' ');

      return res.status(200).json({
        success: true,
        firstName: nameParts[0] || displayName,
        lastName: nameParts.slice(1).join(' ') || ''
      });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('auth-admin error:', err);
    return res.status(500).json({ error: err.message });
  }
}