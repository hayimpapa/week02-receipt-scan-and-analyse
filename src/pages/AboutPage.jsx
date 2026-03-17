export default function AboutPage() {
  return (
    <div className="about-page">
      <h2>About This Build</h2>
      <p className="about-subtitle">
        Week 2 of <strong>52 apps in 52 weeks before I turn 52</strong> — Hey I'm Papa
      </p>

      <div className="card">
        <h3>The Problem</h3>
        <p className="about-text">
          Supermarket receipts contain detailed product data that your bank statement
          never shows. I wanted to see exactly what I spend on without connecting my
          bank account.
        </p>
      </div>

      <div className="card">
        <h3>The App</h3>
        <p className="about-text">
          A mobile-friendly web app that lets you snap a photo of any supermarket
          receipt, uses Claude AI vision to extract and categorise every line item,
          stores your history in Supabase, and visualises spending trends with
          interactive charts.
        </p>
      </div>

      <div className="card">
        <h3>The Prompt</h3>
        <p className="about-text">
          <a
            href="https://github.com/hayimpapa/week02-receipt-scan-and-analyse/blob/main/PROMPTS.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="about-link"
          >
            View the prompt used to build this app
          </a>
        </p>
      </div>

      <div className="card about-repo-card">
        <h3>GitHub Repo</h3>
        <a
          href="https://github.com/hayimpapa/week02-receipt-scan-and-analyse"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary about-repo-btn"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
