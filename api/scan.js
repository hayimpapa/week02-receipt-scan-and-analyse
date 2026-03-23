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

function convertDateToISO(dateStr) {
  if (!dateStr) return dateStr;
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let [, day, month, year] = match;
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

async function checkDuplicateReceipt(supabase, receiptData) {
  const date = convertDateToISO(receiptData.date);
  const total = Number(receiptData.receiptTotal || 0);

  const { data, error } = await supabase
    .from('receipts')
    .select('id, merchant, date, receipt_total')
    .eq('date', date)
    .eq('receipt_total', total);

  if (error) return [];

  const merchantLower = (receiptData.merchant || '').trim().toLowerCase();
  return (data || []).filter(
    (r) => r.merchant?.trim().toLowerCase() === merchantLower
  );
}

async function saveReceiptToSupabase(supabase, receiptData) {
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .insert({
      merchant: receiptData.merchant,
      date: convertDateToISO(receiptData.date),
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

  return receipt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey || !sessionSecret) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Validate session token
  const token = req.headers['x-session-token'];
  if (!validateToken(token, sessionSecret)) {
    return res.status(401).json({ error: 'Unauthorised - owner login required' });
  }

  const { image, mimeType, prompt } = req.body || {};

  if (!image || !prompt) {
    return res.status(400).json({ error: 'Missing image or prompt' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType || 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `Anthropic API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // Extract the receipt JSON from Claude's response
    const textContent = data.content.find((c) => c.type === 'text');
    if (!textContent) {
      return res.status(200).json(data);
    }

    let jsonStr = textContent.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let receiptData;
    try {
      receiptData = JSON.parse(jsonStr);
    } catch {
      // If we can't parse JSON, return the raw Claude response
      return res.status(200).json(data);
    }

    // Check for duplicates before saving
    let savedReceipt = null;
    let duplicates = [];
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        duplicates = await checkDuplicateReceipt(supabase, receiptData);
      } catch {
        // Ignore duplicate check errors — proceed to save
      }

      // If duplicates found, return data without saving so user can decide
      if (duplicates.length > 0) {
        return res.status(200).json({
          receipt: receiptData,
          receiptId: null,
          duplicates,
        });
      }

      try {
        savedReceipt = await saveReceiptToSupabase(supabase, receiptData);
      } catch (err) {
        return res.status(200).json({
          receipt: receiptData,
          receiptId: null,
          supabaseError: err.message || 'Failed to save to Supabase',
        });
      }
    }

    return res.status(200).json({
      receipt: receiptData,
      receiptId: savedReceipt?.id || null,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to call Anthropic API' });
  }
}
