/* ═══════════════════════════════════════════════
   BURNHAM MARKET — api/auth-admin.js
   Authenticates admins via Firebase Auth REST API
   and checks role in Realtime Database
   ═══════════════════════════════════════════════ */

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_DB_URL  = 'https://burnhammarketcraftfair-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  try {
    // Step 1 — Authenticate with Firebase Auth
    const authResponse = await fetch(
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

    const authData = await authResponse.json();

    if (!authResponse.ok || !authData.idToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Step 2 — Check role in Firebase Realtime Database
const emailKey = username.toLowerCase().replace(/@/g, '-at-').replace(/\./g, '-');    const roleResponse = await fetch(
      `${FIREBASE_DB_URL}/admins/roles/${emailKey}.json`
    );
    const role = await roleResponse.json();

    if (!role || !['master', 'events'].includes(role)) {
      return res.status(401).json({ error: 'Access denied' });
    }

    // Step 3 — Return success
    const emailName   = username.split('@')[0];
    const displayName = authData.displayName || emailName;
    const nameParts   = displayName.split(' ');

    return res.status(200).json({
      success:   true,
      firstName: nameParts[0] || displayName,
      lastName:  nameParts.slice(1).join(' ') || ''
    });

  } catch (err) {
    console.error('auth-admin error:', err);
    return res.status(500).json({ error: err.message });
  }
}