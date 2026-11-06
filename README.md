# ReLife — Give Everything a Second Life

ReLife is a React + Vite sustainability platform with a Supabase-backed community and an AI Innovation Studio for object reuse and unused-space revival.

## Features

- Email/password authentication with Supabase.
- Community board for object reuse, space revival and materials to share.
- Upload and publish community photos.
- **AI Innovation Studio:** upload a photo of an object or unused space, receive a practical step-by-step reuse plan, materials/tools list, approximate INR budget, safety notes and alternative ideas.
- Generate an AI after-transformation concept image based on the uploaded photo and save it with the project.
- Private saved project history for each signed-in user.

## 1. Supabase setup

1. Create a Supabase project at https://supabase.com/dashboard.
2. In **SQL Editor**, run `supabase/schema.sql` (the community schema).
3. Run `supabase/innovation-studio.sql` (the AI project history table and RLS policies).
4. In **Project Settings → API Keys**, copy the Project URL and the publishable key. Never use the secret/service-role key in the browser.
5. In **Authentication → URL Configuration**, set your Vercel site URL and add it to Redirect URLs. For local testing add `http://localhost:5173/**`.
6. Email/password sign-up is used. If email confirmation is enabled, users must confirm their email before signing in.

## 2. Vercel environment variables

In **Vercel → ReLife → Settings → Environment Variables**, add these for Production (and Preview if required):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key (or legacy anon key) |
| `GEMINI_API_KEY` | Google AI Studio Gemini API key |

**Important:** `GEMINI_API_KEY` must be a server-side Vercel variable with no `VITE_` prefix. Never commit it or expose it in frontend code. Redeploy after adding or changing variables.

Get a Gemini API key from https://aistudio.google.com/app/apikey. The text guide uses `gemini-2.5-flash`; the visual after-image uses `gemini-3.1-flash-image`. Google's current pricing page lists image generation as paid-tier only; image generation can incur charges. Check your model access, quota and billing in AI Studio before using it. The text model may have free-tier availability subject to Google's limits.

## 3. Run locally

Create a local `.env.local` file (never commit it):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Then run:

```bash
npm install
npm run dev
```

Vercel serverless API routes are available after deployment; local Vite alone does not execute `api/innovate.js`. To test the API locally, use the Vercel CLI with the same local environment variables.

## 4. AI workflow

1. Sign in to ReLife.
2. Choose **Space revival** or **Object reuse**.
3. Upload a JPG, PNG or WebP photo and optionally describe constraints such as dimensions, sunlight, budget or damage.
4. Select **Create my reuse guide**. The AI analyses the photo and returns a practical plan. The original photo and guide are saved to the user's private project history.
5. Select **Generate after image** to create a visual concept based on the original photo and recommended transformation. The generated image is saved to the same project.

AI suggestions are ideas, not professional engineering advice. Users should verify dimensions, load capacity, material condition, electrical/plumbing requirements and local prices. Structural or hazardous work requires a qualified professional.

## 5. Storage and privacy

- The `relife-photos` bucket stores community photos and private project uploads.
- The bucket is public for image delivery; do not upload sensitive or private photos. Innovation records are protected by Row Level Security so only their owner can read or manage the records.
- Never put a Supabase secret/service-role key or Gemini key in a `VITE_*` variable or commit secrets to GitHub.
- The Gemini API endpoint checks the caller's Supabase access token before making an AI request.

## Build

```bash
npm install
npm run build
```

Vercel uses `npm run build` and `dist` as the output directory. GitHub Actions checks the frontend build and the serverless API syntax.
