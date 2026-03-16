import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;

function convertDateToISO(dateStr) {
  if (!dateStr) return dateStr;
  // Convert DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already in YYYY-MM-DD or other format, return as-is
  return dateStr;
}

export async function saveReceipt(receiptData) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .insert({
      merchant: receiptData.merchant,
      date: convertDateToISO(receiptData.date),
      receipt_total: receiptData.receiptTotal,
      total_gst: receiptData.totalGST,
      payment_method: receiptData.paymentMethod,
      image_url: receiptData.imageUrl || null,
    })
    .select()
    .single();

  if (receiptError) throw receiptError;

  const items = receiptData.items.map((item) => ({
    receipt_id: receipt.id,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    gst: item.gst,
    category: item.suggestedCategory,
  }));

  const { error: itemsError } = await supabase
    .from('receipt_items')
    .insert(items);

  if (itemsError) throw itemsError;

  return receipt;
}

export async function getReceipts() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getReceiptsByDateRange(startDate, endDate) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}
