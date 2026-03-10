# Receipt Analyser

Scan receipts with your phone camera, extract line items using Claude AI vision, and track your spending over time.

**Week 2** of *52 apps in 52 weeks before I turn 52* — Hey I'm Papa

GitHub: [https://github.com/hayimpapa/week02-receipt-scan-and-analyse](https://github.com/hayimpapa/week02-receipt-scan-and-analyse)

---

## How It Works

1. Open the app on your phone or desktop
2. Use the camera to capture a receipt photo
3. Claude AI extracts merchant, items, prices, and categories
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

Create a `.env` file in the project root:

```
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key-here
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
VITE_GA4_MEASUREMENT_ID=your-ga4-measurement-id-here
```

See `.env.example` for the template.

### Getting Your API Keys

**Anthropic API Key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to API Keys and create a new key
4. Copy the key into `VITE_ANTHROPIC_API_KEY`

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
3. Copy the **Project URL** — paste it as `VITE_SUPABASE_URL` in your `.env` file
4. Copy the **anon public** key — paste it as `VITE_SUPABASE_ANON_KEY` in your `.env` file

### 4. Where to Paste Them

Open (or create) the `.env` file in the root of this project and add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

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
3. Add your environment variables in the Vercel dashboard under Settings > Environment Variables
4. Deploy

## Prompt

The prompt used to generate this app is documented in `PROMPTS.txt`.

## 52 Builds Tracker

Link to the 52 Builds Tracker repo: *(to be added later)*

---

Built with React, Vite, Claude AI, Supabase, and Recharts.
