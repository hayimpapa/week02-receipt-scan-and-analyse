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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const token = req.headers['x-session-token'];
  if (!validateToken(token, sessionSecret)) {
    return res.status(401).json({ error: 'Unauthorised - owner login required' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const receiptData = req.body;
  if (!receiptData || !receiptData.merchant) {
    return res.status(400).json({ error: 'Receipt data is required' });
  }

  try {
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        merchant: receiptData.merchant,
        date: receiptData.date,
        receipt_total: receiptData.receiptTotal,
        total_gst: receiptData.totalGST,
        payment_method: receiptData.paymentMethod,
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    const items = (receiptData.items || []).map((item) => ({
      receipt_id: receipt.id,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      gst: item.gst,
      category: item.suggestedCategory,
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(items);

      if (itemsError) throw itemsError;
    }

    return res.status(200).json({ receiptId: receipt.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to save receipt' });
  }
}
