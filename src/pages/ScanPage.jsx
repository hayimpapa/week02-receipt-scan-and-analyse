import { useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import ReceiptReview from '../components/ReceiptReview';
import { extractReceiptData } from '../services/claude';
import { saveReceipt, isSupabaseConfigured } from '../services/supabase';
import { trackEvent } from '../services/analytics';

export default function ScanPage() {
  const [stage, setStage] = useState('camera'); // camera | processing | review | saved
  const [receiptData, setReceiptData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCapture = async (base64Data, previewUrl) => {
    setImagePreview(previewUrl);
    setStage('processing');
    setError(null);

    try {
      trackEvent('receipt_scan_started');
      const data = await extractReceiptData(base64Data, 'image/jpeg');
      setReceiptData(data);
      setStage('review');
      trackEvent('receipt_scan_success', { merchant: data.merchant });
    } catch (err) {
      setError(err.message);
      setStage('camera');
      trackEvent('receipt_scan_error');
    }
  };

  const handleSave = async (data) => {
    setSaving(true);
    setError(null);

    try {
      await saveReceipt(data);
      setStage('saved');
      trackEvent('receipt_saved', { merchant: data.merchant, total: data.receiptTotal });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setStage('camera');
    setReceiptData(null);
    setImagePreview(null);
    setError(null);
  };

  const handleNewScan = () => {
    setStage('camera');
    setReceiptData(null);
    setImagePreview(null);
    setError(null);
  };

  return (
    <div className="scan-page">
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {stage === 'camera' && (
        <CameraCapture onCapture={handleCapture} />
      )}

      {stage === 'processing' && (
        <div className="processing-container">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Processing receipt"
              className="processing-preview"
            />
          )}
          <div className="spinner" />
          <p>Analysing receipt with Claude AI...</p>
        </div>
      )}

      {stage === 'review' && receiptData && (
        <ReceiptReview
          receiptData={receiptData}
          onSave={handleSave}
          onRetake={handleRetake}
          saving={saving}
        />
      )}

      {stage === 'saved' && (
        <div className="saved-container">
          <div className="success-icon">✓</div>
          <h2>Receipt Saved!</h2>
          <p>Your receipt has been saved to Supabase.</p>
          <button className="btn btn-primary" onClick={handleNewScan}>
            Scan Another Receipt
          </button>
        </div>
      )}

      {!isSupabaseConfigured() && stage === 'camera' && (
        <div className="config-notice">
          <p>
            <strong>Note:</strong> Supabase is not configured. Receipts won't be saved.
            See README.md for setup instructions.
          </p>
        </div>
      )}

      {!import.meta.env.VITE_ANTHROPIC_API_KEY && stage === 'camera' && (
        <div className="config-notice">
          <p>
            <strong>Note:</strong> Anthropic API key is not configured. Receipt scanning won't work.
            Add VITE_ANTHROPIC_API_KEY to your .env file.
          </p>
        </div>
      )}
    </div>
  );
}
