import { useState } from 'react';
import { CATEGORIES } from '../services/claude';

export default function ReceiptReview({
  receiptData,
  onSave,
  onRetake,
  onCancel,
  saving,
  duplicateWarning,
  editMode,
}) {
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

  const saveLabel = editMode
    ? 'Save Changes'
    : duplicateWarning
    ? 'Save Anyway'
    : saving
    ? 'Saving...'
    : 'Save to Supabase';

  return (
    <div className="review-container">
      <h2>{editMode ? 'Edit Receipt' : 'Review Receipt'}</h2>

      {duplicateWarning && (
        <div className="duplicate-warning">
          <p>
            This receipt looks like it may already be saved (same merchant, date and total). Save anyway?
          </p>
        </div>
      )}

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
                  &times;
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
          <div className="form-group small totals-input">
            <input
              type="number"
              value={data.receiptTotal}
              onChange={(e) => updateField('receiptTotal', parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>
        </div>
        <div className="totals-row">
          <span>Total GST:</span>
          <div className="form-group small totals-input">
            <input
              type="number"
              value={data.totalGST}
              onChange={(e) => updateField('totalGST', parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="review-actions">
        {onCancel ? (
          <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={onRetake} disabled={saving}>
            {duplicateWarning ? 'Cancel' : 'Retake'}
          </button>
        )}
        <button className="btn btn-primary" onClick={() => onSave(data)} disabled={saving}>
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  );
}
