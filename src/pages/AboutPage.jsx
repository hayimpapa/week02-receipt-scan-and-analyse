import { useState, useEffect } from 'react';

const STORAGE_KEY = 'receipt-analyser-about';

const DEFAULT_CONTENT = {
  problem:
    "Supermarket receipts contain detailed product data that your bank statement never shows. I wanted to see exactly what I spend on without connecting my bank account.",
  approach:
    "Camera capture on mobile, Claude AI vision to extract and categorise line items, Supabase to store history, Recharts for spending trends.",
  prompt: '',
  whatGotBuilt: '',
  whatIdDoDifferently: '',
  githubLink: '',
};

export default function AboutPage() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setContent({ ...DEFAULT_CONTENT, ...JSON.parse(stored) });
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const updateField = (field, value) => {
    setContent((prev) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="about-page">
      <h2>About This Build</h2>
      <p className="about-subtitle">
        Week 2 of <strong>52 apps in 52 weeks before I turn 52</strong> — Hey I'm Papa
      </p>

      <div className="card">
        <h3>The Problem</h3>
        <textarea
          value={content.problem}
          onChange={(e) => updateField('problem', e.target.value)}
          rows={3}
        />
      </div>

      <div className="card">
        <h3>The Approach</h3>
        <textarea
          value={content.approach}
          onChange={(e) => updateField('approach', e.target.value)}
          rows={3}
        />
      </div>

      <div className="card">
        <h3>The Prompt</h3>
        <textarea
          value={content.prompt}
          onChange={(e) => updateField('prompt', e.target.value)}
          rows={4}
          placeholder="Paste the prompt you used to generate this app..."
        />
      </div>

      <div className="card">
        <h3>What Got Built</h3>
        <textarea
          value={content.whatGotBuilt}
          onChange={(e) => updateField('whatGotBuilt', e.target.value)}
          rows={4}
          placeholder="Describe what was built..."
        />
      </div>

      <div className="card">
        <h3>What I'd Do Differently</h3>
        <textarea
          value={content.whatIdDoDifferently}
          onChange={(e) => updateField('whatIdDoDifferently', e.target.value)}
          rows={4}
          placeholder="Reflections on what could be improved..."
        />
      </div>

      <div className="card">
        <h3>GitHub Link</h3>
        <input
          type="url"
          value={content.githubLink}
          onChange={(e) => updateField('githubLink', e.target.value)}
          placeholder="https://github.com/..."
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        {saved ? 'Saved!' : 'Save to LocalStorage'}
      </button>
    </div>
  );
}
