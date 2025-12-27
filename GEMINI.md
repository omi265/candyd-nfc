# Candyd NFC - Project Context

## Project Overview
**Candyd NFC** is a Next.js 16 web application designed to bridge physical NFC-enabled products ("Charms") with digital memories. Users can tap a charm to instantly access associated photo/video memories or "Life Lists" (bucket lists). The system supports standard user accounts, physical token-based authentication, and restricted guest access for sharing.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM 7.x)
- **Authentication:** NextAuth.js v5 (Credentials & Custom NFC Token flow)
- **Styling:** Tailwind CSS v4, Framer Motion (Animations)
- **Media Storage:** Cloudinary
- **UI Components:** Radix UI primitives, Lucide React icons, Sonner (toasts)

## Architecture & Structure
The project follows the Next.js App Router conventions:

- **`app/`**: Application routes and pages.
    - **`actions/`**: Server Actions for backend logic (DB mutations, Auth, etc.). **Preferred over API routes.**
    - **`api/`**: Limited API routes (mainly for NextAuth and Cloudinary signatures).
    - **`components/`**: Page-specific components.
    - **`life-charm/`**: Feature-specific routes for Life Lists (bucket lists).
    - **`guest/`**: Routes for guest access flow.
    - **`nfc/`**: Route for handling physical NFC tag redirection.
- **`components/`**: Shared/Global UI components.
    - **`ui/`**: Reusable primitives (buttons, drawers, etc.).
- **`lib/`**: Utilities, DB client, Auth configuration, Cloudinary helpers.
- **`prisma/`**: Database schema (`schema.prisma`) and migrations.

## Key Workflows

### 1. Authentication
- **Standard:** Email/Password via NextAuth Credentials provider.
- **NFC:** User taps a tag -> redirects to `/nfc/login?token=XYZ` -> System looks up product by token -> Logs in owner -> Redirects to filtered view.
- **Guest:** User visits `/guest/login?token=XYZ` -> System validates product guest token -> Sets `guest_session` cookie -> Grants restricted access.

### 2. Memory Management (`app/actions/memories.ts`)
- **Creation:** Form data is sent to `createMemory` server action.
- **Media:** Client uploads directly to Cloudinary using a signed URL (from `app/actions/upload.ts`). The resulting URL is sent to the server to be stored in Postgres.
- **Validation:** Zod schemas are used to validate form data before DB insertion.

### 3. Life Charms (`app/life-charm/`)
- A special type of product (`type: "LIFE"`).
- Users manage a list of items (status: `pending` -> `lived`).
- "Graduating" a charm locks it or changes its state.

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- PostgreSQL Database
- Cloudinary Account

### Commands
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev`
- **Database Migration:** `npx prisma migrate dev`
- **Generate Prisma Client:** `npx prisma generate`
- **Production Build:** `npm run build`
- **Start Production:** `npm start`
- **Linting:** `npm run lint`

### Environment Variables
Required `.env` file variables:
```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

## Development Conventions
- **Server Actions:** Use Server Actions (`"use server"`) for data mutations and fetching where possible, instead of REST API routes.
- **Styling:** Use Tailwind CSS utility classes. Avoid CSS modules unless necessary for complex animations.
- **Type Safety:** Strictly use TypeScript interfaces/types for all props and data structures. Use Zod for runtime validation.
- **Icons:** Use `lucide-react` for icons.
- **Route Protection:** Handled in `middleware.ts`. Public routes are explicitly defined; everything else requires auth.
