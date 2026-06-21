/* ═══════════════════════════════════════════════
   BURNHAM MARKET — api/flower-show-entry.js
   Proxies flower show entry form to Google Sheets
   ═══════════════════════════════════════════════ */

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      redirect: 'follow'
    });

    const text = await response.text();

    // Try to parse as JSON, but don't fail if it's not
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      // Google sometimes returns non-JSON even on success.
      // Since the data write happens before the response, treat as success.
      console.log('Google Script returned non-JSON, but request was sent:', text.substring(0, 100));
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('Flower show entry error:', err);
    return res.status(500).json({ error: err.message });
  }
}