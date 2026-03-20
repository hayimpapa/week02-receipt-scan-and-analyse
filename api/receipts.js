import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function validateToken(token, sessionSecret) {
  if (!token || !sessionSecret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [uuid, signature] = parts;
  const expected = crypto
    .createHmac('sha256', sessionSecret)
    .update(uuid)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Validate session token
  const token = req.headers['x-session-token'];
  if (!validateToken(token, sessionSecret)) {
    return res.status(401).json({ error: 'Unauthorised - owner login required' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // DELETE: remove a receipt by id (receipt_items cascade via FK)
  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    if (!id) {
      return res.status(400).json({ error: 'Receipt id is required' });
    }
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to delete receipt' });
    }
  }

  const { range } = req.query || {};

  try {
    let query = supabase
      .from('receipts')
      .select('*, receipt_items(*)')
      .order('date', { ascending: false });

    if (range && range !== 'all') {
      const daysMatch = range.match(/^(\d+)d$/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        query = query.gte('date', cutoffStr);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ receipts: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch receipts' });
  }
}
