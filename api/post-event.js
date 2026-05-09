/* ═══════════════════════════════════════════════
   BURNHAM MARKET — api/post-event.js
   Vercel serverless function to read/write
   events.json in the burnham-market-data repo
   ═══════════════════════════════════════════════ */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'keithjmorris';
const GITHUB_REPO  = 'burnham-market-data';
const GITHUB_FILE  = 'events.json';
const GITHUB_API   = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ── GET current events and SHA ──────────────
    const getRes = await fetch(GITHUB_API, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
    const fileData = await getRes.json();
    const sha      = fileData.sha;
    const events   = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    // ── Handle different methods ────────────────
    if (req.method === 'GET') {
      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      // Add new event
      const newEvent = req.body;
      newEvent.id = `E${Date.now()}`;
      events.push(newEvent);
    }

    if (req.method === 'PUT') {
      // Edit existing event
      const { id, ...updates } = req.body;
      const index = events.findIndex(e => e.id === id);
      if (index === -1) return res.status(404).json({ error: 'Event not found' });
      events[index] = { ...events[index], ...updates };
    }

    if (req.method === 'DELETE') {
      // Delete event
      const { id } = req.body;
      const index = events.findIndex(e => e.id === id);
      if (index === -1) return res.status(404).json({ error: 'Event not found' });
      events.splice(index, 1);
    }

    // ── Write updated events back to GitHub ─────
    const updatedContent = Buffer.from(JSON.stringify(events, null, 2)).toString('base64');
    const putRes = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update events via admin panel`,
        content: updatedContent,
        sha: sha,
      })
    });

    if (!putRes.ok) throw new Error(`GitHub PUT failed: ${putRes.status}`);
    return res.status(200).json({ success: true, events });

  } catch (err) {
    console.error('post-event error:', err);
    return res.status(500).json({ error: err.message });
  }
}