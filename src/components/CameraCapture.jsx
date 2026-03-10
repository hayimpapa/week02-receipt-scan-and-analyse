import { useRef, useState, useCallback, useEffect } from 'react';

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      // Extract base64 data (remove the data:image/jpeg;base64, prefix)
      const base64Data = capturedImage.split(',')[1];
      onCapture(base64Data, capturedImage);
    }
  }, [capturedImage, onCapture]);

  if (error) {
    return (
      <div className="camera-container">
        <div className="camera-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={startCamera}>
            Retry
          </button>
          {onCancel && (
            <button className="btn btn-secondary" onClick={onCancel} style={{ marginLeft: '0.5rem' }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="camera-container">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!capturedImage ? (
        <>
          <div className="camera-preview">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', borderRadius: '12px' }}
            />
          </div>
          <div className="camera-controls">
            <button
              className="btn btn-capture"
              onClick={capturePhoto}
              disabled={!isStreaming}
            >
              <span className="capture-icon" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="camera-preview">
            <img
              src={capturedImage}
              alt="Captured receipt"
              style={{ width: '100%', borderRadius: '12px' }}
            />
          </div>
          <div className="camera-controls">
            <button className="btn btn-secondary" onClick={retake}>
              Retake
            </button>
            <button className="btn btn-primary" onClick={confirmCapture}>
              Use This Photo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
