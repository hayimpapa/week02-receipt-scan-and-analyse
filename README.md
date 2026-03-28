# Receipt Analyser

Scan receipts with your phone camera, extract line items using Claude AI vision, and track your spending over time.

**Week 2** of *52 apps in 52 weeks before I turn 52* — Hey I'm Papa

GitHub: [https://github.com/hayimpapa/week02-receipt-scan-and-analyse](https://github.com/hayimpapa/week02-receipt-scan-and-analyse)

---

## Features

- **Receipt Scanning** — Capture receipts using your device camera with live preview, confirmation, and retake
- **AI Extraction** — Claude AI (claude-sonnet-4-20250514) extracts merchant, items, prices, GST, and categories from receipt images
- **Duplicate Detection** — Automatically detects duplicate receipts (same merchant, date, and total) before saving
- **Review & Edit** — Edit extracted data before saving to the database
- **Spending Reports** — Bar and pie charts with date range filters (7d, 30d, 90d, MTD, YTD, all time)
- **Receipt Management** — Search, filter, sort, paginate, view, edit, and delete saved receipts
- **Guest & Owner Modes** — Full UI visible to guests; scanning and saving require owner authentication
- **18 Item Categories** — Groceries, Fruit & Veg, Meat & Seafood, Deli & Bakery, Dairy & Eggs, Frozen Foods, Snacks & Confectionery, Beverages, Alcohol, Household & Cleaning, Health & Beauty, Baby & Kids, Pet Supplies, Clothing, Electronics, Dining Out, Fuel, Other

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Recharts 3 |
| Build | Vite 7 |
| Backend | Vercel Serverless Functions (Node.js) |
| AI | Anthropic Claude API (Vision) |
| Database | Supabase (PostgreSQL) |
| Analytics | Google Analytics GA4 |
| Auth | HMAC-SHA256 signed session tokens |

## Project Structure

```
├── api/                        # Vercel serverless functions
│   ├── auth.js                 # Owner password validation & token generation
│   ├── scan.js                 # Claude AI receipt extraction + save to Supabase
│   ├── receipts.js             # CRUD operations for receipts
│   └── save.js                 # Standalone receipt save endpoint
├── src/
│   ├── components/
│   │   ├── CameraCapture.jsx   # Device camera access & photo capture
│   │   ├── NavBar.jsx          # Navigation bar with lock icon
│   │   ├── OwnerModal.jsx      # Password entry modal
│   │   └── ReceiptReview.jsx   # Editable receipt form
│   ├── contexts/
│   │   └── AuthContext.jsx     # Owner mode state management
│   ├── pages/
│   │   ├── ScanPage.jsx        # Camera → extract → review → save flow
│   │   ├── ReportsPage.jsx     # Spending analytics with charts
│   │   ├── MyReceiptsPage.jsx  # Receipt list with search/filter/sort
│   │   └── AboutPage.jsx       # Project information
│   ├── services/
│   │   ├── api.js              # API base path helper
│   │   ├── auth.js             # Session token management
│   │   ├── claude.js           # Receipt extraction prompt & categories
│   │   └── analytics.js        # GA4 event tracking
│   ├── App.jsx                 # Router setup with 4 routes
│   ├── App.css                 # Main styles
│   ├── index.css               # Global styles
│   └── main.jsx                # React entry point
├── vercel.json                 # Vercel routing rewrites
├── vite.config.js              # Vite config (base: /week02/)
└── PROMPTS.txt                 # Original prompts used to build the app
```

## Guest vs Owner Mode

The app has two modes:

- **Guest mode** (default): The full UI is visible and explorable, but scanning and capturing receipts is disabled. Clicking Scan or Capture shows a friendly message directing you to run the app locally.
- **Owner mode**: Click the lock icon in the top-right corner of the navbar, enter the owner password, and unlock full scanning and Supabase saving. The session is stored in `sessionStorage` and clears automatically when the browser tab closes.

## How It Works

1. Open the app on your phone or desktop
2. Use the camera to capture a receipt photo
3. Claude AI extracts merchant, items, prices, and categories (owner mode required)
4. Review and edit the extracted data
5. Save to Supabase for history and reporting
6. View spending trends in the Reports tab

## Run Locally

```bash
git clone https://github.com/hayimpapa/week02-receipt-scan-and-analyse.git
cd week02-receipt-scan-and-analyse
npm install
npm run dev
```

## Environment Variables

### Frontend variables (local development only)

Create a `.env` file in the project root for local development:

```
VITE_GA4_MEASUREMENT_ID=your-ga4-measurement-id-here
```

See `.env.example` for the template.

### Vercel server-side environment variables

These must be added in the Vercel dashboard under **Settings > Environment Variables**. They are used only by the serverless functions and are never exposed to the browser:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude AI |
| `OWNER_PASSWORD` | The password required to unlock owner mode |
| `SESSION_SECRET` | A random string used to sign session tokens |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key |

**No `.env` file is needed for the live deployment** — only set these in the Vercel dashboard. For local development with `vercel dev`, you can add them to a `.env.local` file (which is gitignored by Vercel by default).

### Getting Your API Keys

**Anthropic API Key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to API Keys and create a new key
4. Add it as `ANTHROPIC_API_KEY` in Vercel environment variables

**Supabase Setup:**
See the Supabase Setup section below.

## Supabase Setup

### 1. Create a Free Supabase Project

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up with GitHub (or email)
3. Click "New Project"
4. Choose your organisation, give it a name (e.g. "receipt-analyser"), set a database password, and pick a region close to you
5. Click "Create new project" and wait for it to finish setting up

### 2. Create the Database Tables

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the following SQL and click **Run**:

```sql
-- Create receipts table
CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant TEXT NOT NULL,
  date DATE NOT NULL,
  receipt_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_gst DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create receipt_items table
CREATE TABLE receipt_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (allow all for now)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on receipts" ON receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on receipt_items" ON receipt_items FOR ALL USING (true) WITH CHECK (true);
```

### 3. Get Your Supabase URL and Anon Key

1. In your Supabase dashboard, click **Settings** (gear icon) in the left sidebar
2. Click **API** under Configuration
3. Copy the **Project URL** — add it as `SUPABASE_URL` in Vercel environment variables
4. Copy the **anon public** key — add it as `SUPABASE_ANON_KEY` in Vercel environment variables

## Google Analytics GA4 Setup

1. Go to [analytics.google.com](https://analytics.google.com)
2. Click **Admin** (gear icon at bottom left)
3. Click **Create Property** and follow the wizard
4. Choose "Web" as the platform
5. Enter your app's URL (e.g. your Vercel deployment URL)
6. Copy the **Measurement ID** (starts with `G-`)
7. Paste it as `VITE_GA4_MEASUREMENT_ID` in your `.env` file

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add the following environment variables in the Vercel dashboard under **Settings > Environment Variables**:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `OWNER_PASSWORD` — the password for owner mode
   - `SESSION_SECRET` — a random string (e.g. generate one with `openssl rand -hex 32`)
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_ANON_KEY` — your Supabase anon key
   - `VITE_GA4_MEASUREMENT_ID` — your GA4 measurement ID
4. Deploy

The `api/` directory is automatically detected by Vercel as serverless functions. No additional configuration is needed.

## Prompt

The prompt used to generate this app is documented in `PROMPTS.txt`.

## 52 Builds Tracker

Link to the 52 Builds Tracker repo: *(to be added later)*

---

Built with React, Vite, Claude AI, Supabase, and Recharts.
