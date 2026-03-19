import { useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import ReceiptReview from '../components/ReceiptReview';
import { extractReceiptData } from '../services/claude';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';

export default function ScanPage() {
  const { isOwner } = useAuth();
  const [stage, setStage] = useState('camera'); // camera | processing | review | saved
  const [receiptData, setReceiptData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [showGuestMessage, setShowGuestMessage] = useState(false);

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

      if (data.receiptId) {
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

  const handleSave = async (data) => {
    // Data is already saved server-side during scan.
    // This handles the case where it wasn't saved (Supabase not configured).
    setStage('saved');
    trackEvent('receipt_saved', { merchant: data.merchant, total: data.receiptTotal });
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
          saving={false}
        />
      )}

      {stage === 'saved' && (
        <div className="saved-container">
          <div className="success-icon">✓</div>
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
