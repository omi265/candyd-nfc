# Candyd NFC 🍬 — Comprehensive Project Documentation

## 1. Executive Summary & Project Philosophy

**Candyd NFC** is an innovative, full-stack Next.js web application designed to bridge physical objects with digital emotional experiences. By linking physical NFC (Near Field Communication) products—referred to as **Charms**—to a cloud-connected platform, users can tap physical tokens to instantly unlock, manage, and relive personal memories, track long-term life goals (bucket lists), or build daily habits with streak tracking.

The application has evolved into a versatile **Multi-Charm Ecosystem** supporting three specialized product modes:
1. **Memory Charms:** Digital time capsules with rich multimedia (photos, videos, audio), mood/emotion tagging, event categorizations, and interactive center-out physical grids.
2. **Life Charms:** Bucket list tracking for life milestones, allowing users to move goals from *Pending* to *Lived*, attach media reflections, and graduate completed charms.
3. **Habit Charms:** Science-backed habit formation tools tracking daily completions, multi-status logs (Done, Sick, Travel, Stressed, Busy, Other), streaks, phases (Initiation, Leveling up), and pause options.

---

## 2. Tech Stack & Architecture Overview

| Category | Technology | Version / Tooling | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | 16.0.10 (App Router) | Full-stack React framework with Server Actions & App Router |
| **UI Library** | React | 19.2.1 | UI rendering engine |
| **Language** | TypeScript | ^5.0.0 | End-to-end type safety |
| **Database** | PostgreSQL | Hosted (Neon/Postgres) | Relational database for core entities |
| **ORM** | Prisma | 7.1.0 (`@prisma/client`, `@prisma/adapter-pg`) | Type-safe database queries and migrations |
| **Auth Engine** | NextAuth.js | v5 (Beta 30) | JWT session management in HTTP-only cookies |
| **Media Engine**| Cloudinary | `cloudinary` Node SDK | Cloud storage, transformation, & automatic WebP optimization |
| **Styling** | Tailwind CSS | v4 (`@tailwindcss/postcss`) | Modern utility-first styling |
| **Animations** | Motion | 12.x (Framer Motion) | Smooth physics-based grid and card transitions |
| **UI Primitives**| Radix UI & Vaul | `@radix-ui/react-dialog`, `vaul` | Accessible drawers, modal dialogs, and slide-over panels |
| **Validation** | Zod | ^4.1.13 | Strict schema validation for actions & API payloads |
| **Notifications**| Sonner | ^2.0.7 | Modern toast alert system |

---

## 3. The Multi-Charm Product Ecosystem

Physical NFC items are modeled as `Product` records, assigned a specific `CharmType` enum (`MEMORY`, `LIFE`, `HABIT`), and linked to a user account.

### 3.1 Memory Charms (`CharmType: MEMORY`)
- **Digital Time Capsule:** Store rich personal memories linked to physical products.
- **Rich Metadata:** Tag memories with dates, time, exact location, custom and pre-defined emotions (e.g. Happy, Nostalgic, Grateful), moods, and event themes (such as Haldi, Sangeet, Ceremonies).
- **Multimedia Gallery:** Upload multiple images, videos, and custom HTML5 audio recordings with media drag-and-drop reordering.
- **Physics-Based Layout:** Interactive center-out grid and masonry list view with proximity-scaled cards.

### 3.2 Life Charms / Bucket Lists (`CharmType: LIFE`)
- **Goal Management:** Organize life goals under structured `LifeList` and `LifeListItem` hierarchies.
- **Status Lifecycle:** Transition items from `pending` to `lived` as goals are achieved.
- **Experience Logging:** When an item is marked "Lived", attach location data, reflection notes, tagged people, and photos/videos (`Experience` & `ExperienceMedia`).
- **Templates & Graduation:** Quick-start with pre-configured templates (e.g., Travel, Career, Personal Growth). Completed Life Charms can be "Graduated" and preserved as locked digital chapters.

### 3.3 Habit Charms (`CharmType: HABIT`)
- **Daily Habit Tracking:** Form habits with target days (default 66 days for habit formation), current streaks, and longest streaks.
- **Flexible Logging:** Record daily status with `HabitLogType`: `DONE`, `SICK`, `TRAVEL`, `STRESSED`, `BUSY`, or `OTHER`.
- **Habit Progression:** Tracks initiation phases, levels, streak resets, pause durations (`pauseUntil`), and ritual types.
- **Proof & Reflection:** Attach optional photo proof or text reflections to daily logs.

---

## 4. Database Schema & Data Model

The application utilizes PostgreSQL managed via Prisma ORM (`prisma/schema.prisma`).

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │───────│   Product    │───────│    Memory    │
│              │ 1 : N │   (Charm)    │ 1 : N │              │
└──────────────┘       └──────────────┘       └──────────────┘
   │      │                │      │                  │ 1 : N
   │      │                │      │           ┌──────┴──────┐
   │      │                │      │           │    Media    │
   │      │                │      │           └─────────────┘
   │      │ 1:N            │ 1:N  │ 1:N
   │      ├──────────┐     │      └──────────┐
   │      │          │     │                 │
┌──┴──────┴──┐   ┌───┴─────┴──┐        ┌─────┴──────┐
│  LifeList  │   │   Habit    │        │  Person    │
└────────────┘   └────────────┘        └────────────┘
```

### Key Models Overview:
- **`User`**: Account owner with credentials, role (`USER` or `ADMIN`), setup state, and profile details.
- **`Product`**: NFC Charm instance containing unique token string, active status, state (`ACTIVE`, `GRADUATED`, `CLOSED`), charm type, streak counters, and optional guest upload configuration.
- **`Memory` & `Media`**: Stores memory metadata, emotion arrays, event arrays, location, mood, and associated file uploads with ordering index (`orderIndex`).
- **`LifeList`, `LifeListItem`, `Experience`, `ExperienceMedia`**: Structural hierarchy for bucket list items, target dates, completion reflections, and experience media.
- **`Habit` & `HabitLog`**: Tracks habit configuration, focus areas, ritual types, phase/level tracking, and daily execution logs with log types.
- **`Person`**: Allows users to save tagged companions/friends across memories and life experiences.
- **`SupportTicket`**: Handles customer/user support requests.
- **`ActivityLog`**: Stores user activity logs for security auditing.

---

## 5. Authentication, Authorization & NFC Flow

Candyd NFC implements a dual authentication mechanism using NextAuth.js v5:

### 5.1 Standard Credentials Auth
- Email and bcrypt-hashed password authentication.
- JWT session tokens stored securely in HTTP-only cookies.

### 5.2 NFC Tap-to-Login Flow
1. User taps an NFC physical product containing a link formatted as: `https://app.candyd.co/nfc/login?token={NFC_TOKEN}`.
2. The page extracts the token and invokes NextAuth credential verification via `getProductIdFromToken`.
3. The server locates the corresponding `Product` record and authenticates the product's owner.
4. The user is logged in and redirected to their active dashboard tailored to the charm's type (`/` for Memory, `/life-charm` for Bucket Lists, `/habit-charm` for Habits), automatically pre-filtered to the tapped product.

### 5.3 Route Protection & Middleware
- Route protection is managed by `proxy.ts`.
- Public routes (`/login`, `/register`, `/nfc/login`) are accessible to all guests.
- Protected routes require an active session token.

---

## 6. Server Actions & API Architecture

The codebase relies on React Server Actions located in `app/actions/` for state mutations and database operations:

- **`app/actions/auth.ts`**: Login, registration, profile updates, and logout actions.
- **`app/actions/memories.ts`**: CRUD operations for memories, media reordering, and memory filtering.
- **`app/actions/life-charm.ts`**: Bucket list lifecycle, item status changes, experience logging, and graduation.
- **`app/actions/habit.ts`**: Habit creation, daily log creation (`DONE`, `SICK`, `TRAVEL`, etc.), streak calculations, level transitions, and pauses.
- **`app/actions/nfc.ts`**: Token validation and charm-to-user linking logic.
- **`app/actions/people.ts`**: Managing tagged people/friends.
- **`app/actions/admin.ts`**: Admin overview stats, product token creation, and system monitoring.
- **`app/actions/support.ts`**: Support ticket submission and management.
- **`app/actions/upload.ts`**: Server-signed Cloudinary upload authentication parameters.

---

## 7. Media Handling & Cloudinary Integration

- **Signed Direct Uploads:** Media files are uploaded directly from the browser to Cloudinary using signed parameters generated by `app/actions/upload.ts` to prevent exposing API secrets.
- **Optimization:** Cloudinary URLs are wrapped with helper utilities (`lib/media-helper.ts`) applying dynamic format delivery (`f_auto`), quality optimization (`q_auto`), and max-width scaling (`w_800`).
- **Multi-Format Support:** Full handling for Images (JPG, PNG, WebP, GIF), Videos (MP4, MOV, WebM), and Audio files (MP3, WAV, M4A).
- **Cleanup:** Memory deletion automatically triggers Cloudinary resource destruction for associated media assets.

---

## 8. Directory Structure & Key Files

```
candyd-nfc/
├── app/
│   ├── actions/                 # Server Actions for all feature modules
│   ├── admin/                   # Admin dashboard (stats, product generator)
│   ├── api/                     # NextAuth dynamic routes & upload signing
│   ├── components/              # Application header, home content, audio player
│   ├── habit-charm/             # Habit tracking dashboard & log interfaces
│   ├── life-charm/              # Bucket list dashboard, item details, reflections
│   ├── login/ & register/       # Auth pages
│   ├── manage-charms/           # User product/charm management UI
│   ├── memory/[id]/             # Memory edit and detail view
│   ├── nfc/login/               # NFC tap redirect entrypoint
│   ├── support/                 # Support ticket creation and tracking
│   ├── upload-memory/           # Memory creation interface
│   ├── layout.tsx & page.tsx    # Root layout and Memory home view
├── components/                  # Shared UI primitives (Radix, Vaul drawers)
├── lib/                         # Utilities, db client, templates, media helpers
├── prisma/                      # Database schema and migration files
├── auth.ts & auth.config.ts     # NextAuth.js configuration
├── proxy.ts                # Middleware route protection
└── package.json                 # Project dependencies & scripts
```

---

## 9. Environment Setup & Execution Commands

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Cloudinary account credentials

### Environment Variables (`.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/candyd_db"
AUTH_SECRET="your-generated-nextauth-secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

### Essential CLI Commands
- `npm run dev` — Starts local development server on `http://localhost:3000`
- `npx prisma migrate dev` — Runs PostgreSQL database migrations
- `npx prisma generate` — Generates type-safe Prisma client
- `npm run build` — Compiles production build
- `npm run lint` — Executes ESLint checks
