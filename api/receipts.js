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
  const allowed = ['GET', 'DELETE', 'POST', 'PUT'];
  if (!allowed.includes(req.method)) {
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

  // POST: check for duplicate receipt
  if (req.method === 'POST') {
    const { merchant, date, receipt_total } = req.body || {};
    if (!merchant || !date) {
      return res.status(400).json({ error: 'merchant and date are required' });
    }
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, merchant, date, receipt_total')
        .eq('date', date)
        .eq('receipt_total', Number(receipt_total || 0));

      if (error) throw error;

      // Case-insensitive merchant match
      const merchantLower = merchant.trim().toLowerCase();
      const duplicates = (data || []).filter(
        (r) => r.merchant?.trim().toLowerCase() === merchantLower
      );

      return res.status(200).json({ duplicates });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to check duplicates' });
    }
  }

  // PUT: update an existing receipt and its items
  if (req.method === 'PUT') {
    const { id } = req.query || {};
    if (!id) {
      return res.status(400).json({ error: 'Receipt id is required' });
    }
    const { merchant, date, receipt_total, total_gst, payment_method, items } = req.body || {};
    try {
      // Update the receipt record
      const { error: receiptError } = await supabase
        .from('receipts')
        .update({
          merchant,
          date,
          receipt_total,
          total_gst,
          payment_method,
        })
        .eq('id', id);

      if (receiptError) throw receiptError;

      // Replace all items: delete existing, insert new
      const { error: deleteError } = await supabase
        .from('receipt_items')
        .delete()
        .eq('receipt_id', id);

      if (deleteError) throw deleteError;

      if (items && items.length > 0) {
        const mapped = items.map((item) => ({
          receipt_id: id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          gst: item.gst,
          category: item.category,
        }));

        const { error: insertError } = await supabase
          .from('receipt_items')
          .insert(mapped);

        if (insertError) throw insertError;
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to update receipt' });
    }
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
      } else if (range === 'mtd') {
        const now = new Date();
        const cutoffStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        query = query.gte('date', cutoffStr);
      } else if (range === 'ytd') {
        const cutoffStr = `${new Date().getFullYear()}-01-01`;
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
