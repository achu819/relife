# ReLife – Give Everything a Second Life

A React + Vite sustainability community website. The landing page is public; the community board uses Supabase for accounts, listings and photo storage.

## 1. Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

## 2. Create the Supabase backend

1. Create a free project at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**.
3. Copy the complete contents of \`supabase/schema.sql\` into the editor and click **Run**. This creates the listings table, Row Level Security policies and the public photo bucket.
4. Open **Project Settings → API** (or **Connect**) and copy the Project URL and the publishable/anon public key. Never use the \`service_role\` secret in a browser app.
5. In the Supabase dashboard, open **Authentication → URL Configuration**. Add your deployed Vercel URL to **Site URL** and **Redirect URLs**. For local testing also add \`http://localhost:5173/**\`.
6. Email/password sign-up is enabled by default. If email confirmation is enabled, users must confirm their email before signing in.

## 3. Connect the frontend

Create a local \`.env\` file (do not commit it) with:

\`\`\`env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
\`\`\`

In Vercel, open **Project → Settings → Environment Variables** and add the same two variables for Production (and Preview/Development if needed). Redeploy after saving them.

## 4. What works after setup

- Email/password account creation and sign-in.
- Public community board with filters for object reuse, space revival and materials to share.
- Signed-in users can publish a listing with title, description, optional location and optional photo.
- Photos upload to the \`relife-photos\` Supabase Storage bucket (5 MB limit; JPG, PNG and WebP).
- Users can delete their own listings.
- Row Level Security ensures users can only create, update or delete their own records.

The community section displays setup instructions until both Vercel environment variables are present. The landing page's impact figures remain explicitly illustrative, not live impact metrics.

## Security notes

- The browser uses only the Supabase publishable/anon key. Database access is restricted by the included RLS policies.
- **Never put a Supabase service-role key, database password or other secret in a \`VITE_*\` variable or commit it to GitHub.**
- Public listings and public image URLs are visible to anyone. Do not upload private or sensitive information.

## Build

\`\`\`bash
npm run build
npm run preview
\`\`\`

Vercel uses \`npm run build\` and \`dist\` as the output directory.
