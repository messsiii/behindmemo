# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Behind Memory is an AI-powered love letter generator built with Next.js 15, using AI to help users create personalized letters with photos and stories.

## Key Commands

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production (runs `prisma generate` first)
- `npm run start` - Start production server

### Code Quality & Testing

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types
- `npm run check` - Run lint + typecheck
- `npm run fix:all` - Fix lint, format, and check types

### Database

- `npm run db:push` - Push schema changes to database
- `npm run db:migrate:dev` - Run migrations in development
- `npm run db:migrate:deploy` - Deploy migrations to production
- `npm run db:backup` - Backup database
- `npm run db:check` - Verify database connection

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth + Email verification
- **AI**: MiniMax API for content generation
- **Storage**: Cloudflare R2 for images/audio/media files (migrated from Vercel Blob)
- **Cache**: Upstash Redis
- **Payments**: Paddle integration

### Key Architectural Patterns

1. **API Routes Structure**

   - All API routes use Next.js App Router pattern (`app/api/*/route.ts`)
   - Authentication checked via `getServerSession(authConfig)`
   - Rate limiting implemented with Redis
   - Queue system for long-running AI generation tasks

2. **Database Design**

   - User model with credits system (30 initial credits)
   - Letter model stores generated content with metadata
   - Subscription/Transaction models for payment tracking
   - TemplateUnlock for premium template access

3. **AI Generation Flow**

   - Client uploads photo → R2 storage
   - Creates letter record with `pending` status
   - Adds to queue for background processing
   - Uses streaming responses for real-time updates
   - 60-second timeout for Vercel Hobby plan

4. **Authentication Flow**

   - Google OAuth with NextAuth.js
   - Email verification with 6-digit codes
   - Session management with JWT
   - Account lockout after failed attempts

5. **Credits & Payments**
   - Each generation costs 10 credits
   - VIP users also consume credits
   - Paddle webhooks handle subscription events
   - Multiple pricing tiers for credits packages

## Important Implementation Details

### Environment Variables Required

- Database: `DATABASE_URL`, `POSTGRES_*` variants
- Auth: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- AI: `MINIMAX_API_KEY`
- Storage: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_PUBLIC_URL`
- Cache: `KV_*` Redis URLs and tokens
- Payments: `PADDLE_*` keys and price IDs

### API Endpoints

- `POST /api/generate-letter` - Create letter and queue generation
- `GET /api/letters/[id]` - Get letter status/content
- `POST /api/letters/[id]/generate` - Trigger AI generation
- `POST /api/user/consume-credits` - Deduct user credits
- `POST /api/auth/email-code` - Send verification code

### Component Structure

- `app/write/page.tsx` - Main form for letter creation
- `app/result/[id]/page.tsx` - Display generated letter
- `app/components/LoveLetterForm.tsx` - Core form component
- `app/components/ResultsPage.tsx` - Letter display with templates

### Template System

- 12 templates defined in `ResultsPage.tsx`
- Free templates: classic, postcard, magazine
- Premium templates require VIP or unlock
- Templates support custom fonts, backgrounds, layouts

### Performance Considerations

- Image optimization before upload
- Streaming AI responses
- Queue system for reliability
- 60-second timeout limit on Vercel Hobby
- Redis caching for rate limiting

## Development Notes

- Always run `npm run check` before committing
- Use `npm run fix:all` to auto-fix most issues
- Database migrations require backup first
- Test email sending with `npm run test:email`
- Check `.claude/` directory for user's global preferences
