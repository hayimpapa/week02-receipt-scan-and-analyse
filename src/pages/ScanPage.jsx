import { useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import ReceiptReview from '../components/ReceiptReview';
import { extractReceiptData } from '../services/claude';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { getSessionToken } from '../services/auth';
import { getApiBase } from '../services/api';

export default function ScanPage() {
  const { isOwner } = useAuth();
  const [stage, setStage] = useState('camera'); // camera | processing | review | duplicate | saved
  const [receiptData, setReceiptData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [showGuestMessage, setShowGuestMessage] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCapture = async (base64Data, previewUrl) => {
    if (!isOwner) {
      setShowGuestMessage(true);
      return;
    }

    setImagePreview(previewUrl);
    setStage('processing');
    setError(null);

    try {
      trackEvent('receipt_scan_started');
      const data = await extractReceiptData(base64Data, 'image/jpeg');

      if (data.supabaseError) {
        setError(`Receipt extracted but failed to save: ${data.supabaseError}`);
      }

      setReceiptData(data);

      if (data.duplicates && data.duplicates.length > 0) {
        // Duplicate found — show review with duplicate warning
        setStage('duplicate');
        trackEvent('receipt_duplicate_detected', { merchant: data.merchant });
      } else if (data.receiptId) {
        // Receipt was saved server-side, go straight to saved
        setStage('saved');
        trackEvent('receipt_saved', { merchant: data.merchant, total: data.receiptTotal });
      } else {
        // Show review screen (e.g. Supabase not configured)
        setStage('review');
      }
      trackEvent('receipt_scan_success', { merchant: data.merchant });
    } catch (err) {
      setError(err.message);
      setStage('camera');
      trackEvent('receipt_scan_error');
    }
  };

  async function saveReceiptToServer(data) {
    // Convert date from DD/MM/YYYY to YYYY-MM-DD for storage
    let isoDate = data.date;
    const match = data.date?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) year = '20' + year;
      isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const token = getSessionToken();
    const res = await fetch(`${getApiBase()}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': token,
      },
      body: JSON.stringify({ ...data, date: isoDate }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Failed to save receipt');
    }

    return res.json();
  }

  const handleSave = async (data) => {
    if (data.receiptId) {
      // Already saved server-side
      setStage('saved');
      trackEvent('receipt_saved', { merchant: data.merchant, total: data.receiptTotal });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveReceiptToServer(data);
      setStage('saved');
      trackEvent('receipt_saved', { merchant: data.merchant, total: data.receiptTotal });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAnyway = async (data) => {
    setSaving(true);
    setError(null);
    try {
      await saveReceiptToServer(data);
      setStage('saved');
      trackEvent('receipt_saved_duplicate', { merchant: data.merchant, total: data.receiptTotal });
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

      {stage === 'duplicate' && receiptData && (
        <ReceiptReview
          receiptData={receiptData}
          onSave={handleSaveAnyway}
          onRetake={handleRetake}
          saving={saving}
          duplicateWarning
        />
      )}

      {stage === 'saved' && (
        <div className="saved-container">
          <div className="success-icon">&#x2713;</div>
          <h2>Receipt Saved!</h2>
          <p>Your receipt has been saved.</p>
          <button className="btn btn-primary" onClick={handleNewScan}>
            Scan Another Receipt
          </button>
        </div>
      )}

      {showGuestMessage && (
        <div className="modal-overlay" onClick={() => setShowGuestMessage(false)}>
          <div className="modal-content guest-message" onClick={(e) => e.stopPropagation()}>
            <p>
              This live demo requires owner login.
              Want to run it yourself? See <strong>README.md</strong> for local setup instructions.
            </p>
            <button className="btn btn-primary" onClick={() => setShowGuestMessage(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
