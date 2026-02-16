# Zero-Cost Wedding Media System

A private, "Gatekeeper" wedding photo feed where guests can upload unlimitedly (capped at 10) and the couple approves photos before they go live.

## Features
- **Anonymous Guest Upload**: No sign-up required.
- **Strict Quota**: 10 photos per device (enforced by DB trigger).
- **Gatekeeper Mode**: Admin must approve photos.
- **Zero Cost**: Uses Supabase Free Tier + Netlify Image CDN.

## Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project.
2. Go to the **SQL Editor** and run the contents of `supabase/schema.sql`.
   - This creates the table, indexes, trigger, and RLS policies.
3. Go to **Storage**.
   - Create a new public bucket named `wedding_photos`.
4. Go to **Project Settings > API**.
   - Copy `Project URL` and `anon public` key.

### 2. Environment Variables
Create a `.env` file (copy from `.env.example`) and fill in your details:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally
```bash
npm install
npm run dev
```

### 4. Deploy to Netlify
1. Push this code to GitHub.
2. Link the repository in Netlify.
3. In Netlify Site Settings > **Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Admin Usage
- Navigate to `/admin`.
- Log in with your Supabase credentials (email/password). 
  - *Note: Ensure you have an admin user created in Supabase Auth.*
