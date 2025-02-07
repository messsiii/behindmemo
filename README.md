# AI Love Letter Generator

An AI-powered application that generates personalized love letters based on your photos and stories.

## Features

- Photo upload with EXIF data extraction
- Location detection from GPS coordinates
- AI-generated love letters
- Beautiful responsive UI
- Image optimization

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion
- MiniMax AI API
- Google Maps Geocoding API
- Vercel Blob Storage

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `BLOB_READ_WRITE_TOKEN`: Vercel Blob Storage token
- `MINIMAX_API_KEY`: MiniMax API key
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`: Google Maps API key

## Deployment

This project is configured for automatic deployment with Vercel.