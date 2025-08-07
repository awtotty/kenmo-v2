# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Primary Development**
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build production application
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

**Database Management**
- `npm run db:push` - Push Prisma schema changes to database (⚠️ Be careful - may clear data)
- `npm run db:studio` - Open Prisma Studio for database inspection
- `npm run postinstall` - Generate Prisma client (runs automatically after install)

**Cron Jobs**
- Manual trigger: `curl -X POST https://kenmo-v2.vercel.app/api/cron -H "Authorization: Bearer $CRON_SECRET"`
- Scheduled: Daily at 1 AM UTC for interest calculations

## Application Architecture

**Technology Stack**
- **Framework**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk (with webhook sync to local User model)
- **API Layer**: tRPC for type-safe API calls
- **Styling**: Tailwind CSS with custom theme system
- **State Management**: React Query via tRPC
- **Notifications**: react-hot-toast
- **Monitoring**: Sentry
- **Deployment**: Vercel

**Core Domain Model**
This is a financial education application implementing double-entry bookkeeping:

- **Classes**: Educational contexts with unique codes for student enrollment
- **Users**: Synced from Clerk via webhooks, extended with additional data
- **Enrollments**: User-Class relationships with roles (STUDENT, TEACHER, ADMIN)
- **Accounts**: Financial accounts with interest calculations (checking accounts for students)
- **Transactions**: Double-entry bookkeeping between accounts
- **Ledger**: Individual debit/credit entries for each account
- **CustomTransactions**: Saved transaction templates for reuse

**API Structure (tRPC Routers)**
- `account` - Account management and balance operations
- `transaction` - Transaction creation, retrieval, and custom transaction templates
- `enrollment` - Class enrollment and user-class relationships
- `class` - Class creation and management
- `user` - User data management (synced with Clerk)

**Authentication Flow**
- Clerk handles authentication and user management
- Webhook at `/api/webhooks/clerk` syncs user data to local database
- User model extends Clerk user data with application-specific fields

## Theme System

**Theme Architecture**
- Context: `ThemeContext` provides `theme`, `toggleTheme`, `setTheme`
- Types: `'light' | 'dark'` with system preference detection
- Utilities: `getThemeClasses(theme)` returns structured theme classes
- Persistence: Saved to localStorage as `'kenmo-theme'`

**Theme Usage Pattern**
```typescript
import { useTheme } from '~/contexts/ThemeContext';
import { getThemeClasses } from '~/utils/theme';

const { theme } = useTheme();
const themeClasses = getThemeClasses(theme);

// Use structured classes
className={`${themeClasses.card.background} ${themeClasses.card.border}`}
```

**Theme Class Structure**
- `background.primary/secondary/tertiary` - Background colors
- `text.primary/secondary/tertiary/inverse` - Text colors  
- `border.primary/secondary/accent` - Border colors
- `interactive.primary/secondary/accent` - Button styles
- `card.background/border/hover/shadow` - Card styling
- `nav.background/border/link` - Navigation styling

## Database Considerations

**Double-Entry Bookkeeping**
- All financial transactions create corresponding Ledger entries
- Each transaction involves debits and credits that must balance
- Interest calculations run via cron job, creating new Ledger entries

**Data Sync**
- User creation/updates from Clerk trigger webhook processing
- Database pushes may clear data - be cautious and consider test data regeneration
- Use `Promise.all` when mapping over async operations

**Account Types**
- Students get checking accounts upon class enrollment
- All accounts support interest calculations with configurable rates and periods

## Project Context

**Purpose**: Digital financial education platform ("Digital Ken Kash")
**Story Map**: Available at https://www.figma.com/file/xsd4GCVLP0me0inkLf2bOi/kenmo-stories-and-flows
**Logo Resources**: Available in `/public/logo/svg/` (color, black, white, no-background variants)

**Key Learnings from README**
- Clerk webhook sync is essential for user data consistency
- React hook rules can cause confusing errors - be careful with conditional hooks
- API design was developed ad-hoc - consider more deliberate patterns for new features
- Cron jobs must be defined in `/vercel.json` (not `/public/vercel.json`)