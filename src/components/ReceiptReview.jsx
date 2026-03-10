import { useState } from 'react';
import { CATEGORIES } from '../services/claude';

export default function ReceiptReview({ receiptData, onSave, onRetake, saving }) {
  const [data, setData] = useState({ ...receiptData });

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const deleteItem = (index) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const recalcTotal = () => {
    const total = data.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    const gst = data.items.reduce((sum, item) => sum + (parseFloat(item.gst) || 0), 0);
    setData((prev) => ({ ...prev, receiptTotal: Math.round(total * 100) / 100, totalGST: Math.round(gst * 100) / 100 }));
  };

  return (
    <div className="review-container">
      <h2>Review Receipt</h2>

      <div className="card">
        <div className="form-group">
          <label>Merchant</label>
          <input
            type="text"
            value={data.merchant}
            onChange={(e) => updateField('merchant', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="text"
              value={data.date}
              onChange={(e) => updateField('date', e.target.value)}
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div className="form-group">
            <label>Payment Method</label>
            <input
              type="text"
              value={data.paymentMethod}
              onChange={(e) => updateField('paymentMethod', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Line Items</h3>
        <div className="items-table">
          {data.items.map((item, index) => (
            <div key={index} className="item-row">
              <div className="item-header">
                <input
                  type="text"
                  value={item.productName}
                  onChange={(e) => updateItem(index, 'productName', e.target.value)}
                  className="item-name"
                />
                <button
                  className="btn btn-delete"
                  onClick={() => deleteItem(index)}
                  title="Delete item"
                >
                  ×
                </button>
              </div>
              <div className="item-details">
                <div className="form-group small">
                  <label>Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    step="1"
                    min="0"
                  />
                </div>
                <div className="form-group small">
                  <label>Unit $</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group small">
                  <label>Total $</label>
                  <input
                    type="number"
                    value={item.totalPrice}
                    onChange={(e) => updateItem(index, 'totalPrice', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group small">
                  <label>GST $</label>
                  <input
                    type="number"
                    value={item.gst}
                    onChange={(e) => updateItem(index, 'gst', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={item.suggestedCategory}
                  onChange={(e) => updateItem(index, 'suggestedCategory', e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" onClick={recalcTotal} style={{ marginTop: '1rem' }}>
          Recalculate Totals
        </button>
      </div>

      <div className="card totals-card">
        <div className="totals-row">
          <span>Receipt Total:</span>
          <strong>${parseFloat(data.receiptTotal).toFixed(2)}</strong>
        </div>
        <div className="totals-row">
          <span>Total GST:</span>
          <strong>${parseFloat(data.totalGST).toFixed(2)}</strong>
        </div>
      </div>

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={onRetake} disabled={saving}>
          Retake
        </button>
        <button className="btn btn-primary" onClick={() => onSave(data)} disabled={saving}>
          {saving ? 'Saving...' : 'Save to Supabase'}
        </button>
      </div>
    </div>
  );
}
