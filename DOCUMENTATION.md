# Candyd NFC v2 - Complete Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Architecture](#2-project-architecture)
3. [Database Schema and Models](#3-database-schema-and-models)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Features & Functionality](#5-features--functionality)
6. [API Routes & Server Actions](#6-api-routes--server-actions)
7. [Cloudinary Integration](#7-cloudinary-integration)
8. [UI Components & Pages](#8-ui-components--pages)
9. [State Management](#9-state-management)
10. [Special Features](#10-special-features)
11. [Configuration Files](#11-configuration-files)
12. [Key Dependencies](#12-key-dependencies)
13. [Security Measures](#13-security-measures)
14. [Deployment Considerations](#14-deployment-considerations)
15. [Development Workflow](#15-development-workflow)
16. [Known Patterns & Best Practices](#16-known-patterns--best-practices)

---

## 1. Project Overview

**Candyd NFC** is a Next.js 16 web application for creating, storing, and managing memories linked to physical NFC (Near Field Communication) products. Users can tap NFC-enabled charms to instantly access their associated memories, or share guest access links to allow others to contribute memories to specific products.

### Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Framework (App Router) |
| PostgreSQL | - | Database |
| Prisma ORM | 7.1.0 | Database ORM |
| NextAuth.js | v5 | Authentication (JWT sessions, credentials) |
| Cloudinary | - | Media storage (image, video, audio) |
| Tailwind CSS | 4 | Styling |
| Motion | - | Animations (Framer Motion) |
| Radix UI | - | Accessible UI components |
| Zod | - | Schema validation |
| bcryptjs | - | Password security |

---

## 2. Project Architecture

### File Structure

```
candyd-nfc-v2-next/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (backend logic)
│   │   ├── auth.ts              # Authentication (login, register, logout)
│   │   ├── memories.ts          # Memory CRUD operations
│   │   ├── admin.ts             # Admin dashboard functions
│   │   ├── guest.ts             # Guest session management
│   │   └── upload.ts            # Cloudinary upload signing
│   ├── api/                     # API route handlers
│   │   ├── auth/[...nextauth]   # NextAuth dynamic route
│   │   └── upload/sign          # Cloudinary signature endpoint
│   ├── components/              # Reusable components
│   │   ├── AppHeader.tsx        # Main header with menu
│   │   ├── AudioPlayer.tsx      # Audio playback component
│   │   ├── ClientLayout.tsx     # Root client layout
│   │   └── home-content.tsx     # Memory grid/list view
│   ├── admin/                   # Admin dashboard pages
│   │   ├── page.tsx             # Admin dashboard main
│   │   ├── client.tsx           # Client-side admin form
│   │   └── CopyButton.tsx       # Token copy button
│   ├── login/                   # User authentication
│   │   └── page.tsx             # Login form
│   ├── register/                # User registration
│   │   └── page.tsx             # Register form
│   ├── upload-memory/           # Memory creation
│   │   └── page.tsx             # Memory upload form (users & guests)
│   ├── memory/[id]/             # Memory detail view
│   │   ├── page.tsx             # Server-side wrapper
│   │   └── client.tsx           # Memory edit page
│   ├── manage-charms/           # Product management
│   │   └── page.tsx             # Charm management UI
│   ├── nfc/login/               # NFC token-based login
│   │   └── page.tsx             # NFC authentication
│   ├── guest/                   # Guest access
│   │   ├── login/               # Guest login page
│   │   └── memories/            # Guest memory view
│   ├── settings/                # User settings
│   ├── help/                    # Help pages
│   ├── products/                # Product showcase
│   ├── page.tsx                 # Home page
│   └── layout.tsx               # Root layout
├── components/                  # Global shared components
│   ├── ui/                      # UI building blocks
│   │   └── drawer.tsx           # Radix drawer component
│   └── memory-drawer.tsx        # Memory detail drawer
├── lib/                         # Utility functions
│   ├── auth-context.tsx         # Auth context provider
│   ├── cloudinary.ts            # Cloudinary configuration
│   ├── cloudinary-helper.ts     # Upload/delete utilities
│   ├── media-helper.ts          # Media URL optimization
│   ├── db.ts                    # Prisma client
│   └── utils.ts                 # General utilities
├── prisma/                      # Database
│   ├── schema.prisma            # Data models
│   └── migrations/              # DB migrations
├── public/                      # Static assets
├── auth.ts                      # NextAuth configuration
├── auth.config.ts               # NextAuth config export
├── middleware.ts                # Route protection middleware
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind configuration
└── package.json                 # Dependencies
```

---

## 3. Database Schema and Models

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───────│   Product   │───────│   Memory    │
│             │  1:N  │   (Charm)   │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
                             │                     │
                             │                     │ 1:N
                             │              ┌──────┴──────┐
                      ┌──────┴──────┐       │    Media    │
                      │GuestSession │       │             │
                      └─────────────┘       └─────────────┘
```

### User Model

Core user entity with authentication.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| email | String | Unique email address |
| password | String | Hashed with bcryptjs |
| name | String? | Display name |
| role | Enum (USER/ADMIN) | Authorization role |
| createdAt | DateTime | Account creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations:**
- Has many `memories`
- Has many `products`

### Product Model (NFC Charms)

Represents physical NFC products linked to accounts.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Product display name |
| token | String | Unique NFC identifier |
| userId | String | Owner user ID |
| active | Boolean | Product status |
| guestToken | String? | Token for guest access |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations:**
- Belongs to `user`
- Has many `memories`
- Has many `guestSessions`

### Memory Model

Stores memory information with rich metadata.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Memory title |
| description | String? | Optional description |
| date | DateTime? | Memory date |
| time | String? | Memory time |
| location | String? | Location string |
| emotions | String[] | Array of emotion tags |
| events | String[] | Array of event tags |
| mood | String? | Overall mood |
| userId | String | Owner user ID |
| productId | String? | Associated charm ID |
| isGuest | Boolean | Guest-created flag |
| guestName | String? | Guest attribution |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relations:**
- Belongs to `user`
- Belongs to optional `product`
- Has many `media` files

### Media Model

Stores media file references with ordering support.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| url | String | Cloudinary URL |
| type | String | Media type (image/video/audio) |
| size | Int? | File size in bytes |
| memoryId | String | Parent memory ID |
| orderIndex | Int | Display order (default: 0) |
| createdAt | DateTime | Upload timestamp |

**Relations:**
- Belongs to `memory`

### GuestSession Model

Temporary guest access tokens with expiration.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| token | String | Unique session token |
| productId | String | Associated product ID |
| createdAt | DateTime | Session creation |
| expiresAt | DateTime | Session expiration |

**Relations:**
- Belongs to `product`

---

## 4. Authentication & Authorization

### Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOWS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Standard Login (/login)                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │  Email   │───>│ Lookup   │───>│ Verify   │───>│  JWT   │ │
│  │ Password │    │   User   │    │ Password │    │ Token  │ │
│  └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│                                                              │
│  NFC Token Login (/nfc/login?token=...)                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │   NFC    │───>│  Lookup  │───>│   Get    │───>│  JWT   │ │
│  │  Token   │    │ Product  │    │   User   │    │ Token  │ │
│  └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│                                                              │
│  Guest Login (/guest/login?token=...)                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │  Guest   │───>│ Validate │───>│  Cookie  │               │
│  │  Token   │    │  Token   │    │ Session  │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### NextAuth.js v5 Configuration

**Provider:** Credentials-based (email/password and NFC token)

**Session Strategy:** JWT tokens stored in HTTP-only cookies

**Custom Callbacks:**
- `jwt`: Injects user id and role into token
- `session`: Exposes id and role on session object

### Two Login Methods

#### 1. Standard Login (`/login`)

```typescript
// Authentication flow
1. User submits email and password
2. Server action calls signIn("credentials", ...)
3. Credentials provider looks up user by email
4. Password verified with bcryptjs.compare()
5. User object returned → JWT token created
6. Redirect to home page
```

#### 2. NFC Token Login (`/nfc/login?token={token}`)

```typescript
// NFC authentication flow
1. User taps physical NFC product
2. NFC redirects to /nfc/login?token=...
3. Page extracts token from URL
4. Credentials provider receives token
5. Product lookup by token field
6. Associated user returned for authentication
7. Redirect to home with productId filter
```

### Guest Access System

**Flow:**
1. Admin generates guest link with product's `guestToken`
2. Guest visits `/guest/login?token={guestToken}`
3. Server validates token against Product table
4. HTTP-only cookie set with session info
5. Guest redirected to `/upload-memory`

**Permissions:**
- View memories for the shared product
- Add new memories with guest attribution
- Add media to existing memories
- **Cannot** edit or delete any memories
- **Cannot** access other products

### Authorization Rules

| Route Pattern | Access |
|--------------|--------|
| `/login`, `/register` | Public |
| `/guest/*` | Guest session required |
| `/admin/*` | User with ADMIN role |
| `/upload-memory` | Authenticated or Guest |
| All other routes | Authenticated user |

### Session Management

```typescript
// Session payload structure
{
  user: {
    id: string,      // User ID
    email: string,   // User email
    name: string,    // Display name
    role: "USER" | "ADMIN",
    image?: string   // Profile image
  }
}
```

---

## 5. Features & Functionality

### 5.1 Memory Management

#### Create Memory
- **Route:** `/upload-memory`
- **Fields:** Title, description, date, time, location
- **Emotions:** Pre-defined list + custom input
- **Events:** Wedding-themed (Haldi, Sangeet, etc.) + custom
- **Moods:** Pre-defined options + custom
- **Media:** Multiple images, videos, audio files
- **Charm Association:** Optional product linking

#### View Memories
- **Grid View:** Animated cards with center-out fill
- **List View:** Masonry-style scrollable list
- **Memory Drawer:** Slide-up detail panel
- **Filtering:** By title, description, emotions, moods, events
- **Search:** Real-time text search

#### Edit Memory
- **Route:** `/memory/[id]`
- **Capabilities:**
  - Modify all metadata fields
  - Reorder media with drag handles
  - Add new media files
  - Remove existing media
  - Change charm association

#### Delete Memory
- Confirmation modal required
- Cascading deletion of media records
- Cloudinary file cleanup

### 5.2 NFC Product (Charm) Management

#### Features
| Feature | Description |
|---------|-------------|
| Create Products | Admin generates unique tokens for physical products |
| Manage Charms | View product list, see memory count |
| Token-Based Access | NFC tap triggers authentication |
| Guest Tokens | Separate tokens for sharing |
| Memory Association | Link memories to specific products |
| Delete Charms | Remove with all associated memories |

### 5.3 Guest Access System

```
┌─────────────────────────────────────────────────────────────┐
│                    GUEST ACCESS FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Admin shares link: /guest/login?token={guestToken}       │
│                                                              │
│  2. Guest visits link                                        │
│     └── Token validated against Product.guestToken           │
│     └── Cookie session created                               │
│                                                              │
│  3. Guest redirected to /upload-memory                       │
│     └── Can create new memories                              │
│     └── Can view product's memories at /guest/memories       │
│     └── Can add media to existing memories                   │
│                                                              │
│  4. Guest attribution                                        │
│     └── Memory marked with isGuest: true                     │
│     └── guestName field populated                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Media Handling

#### Upload Flow
```
Client                    Server                    Cloudinary
  │                         │                           │
  ├── Request signature ───>│                           │
  │<── Signed params ───────│                           │
  │                         │                           │
  ├─────────────────── Direct upload ─────────────────>│
  │<────────────────── URL response ──────────────────│
  │                         │                           │
  ├── Save URL to DB ──────>│                           │
  │<── Confirmation ────────│                           │
```

#### Supported Formats
- **Images:** JPG, PNG, SVG, WebP, GIF
- **Videos:** MP4, MOV, WebM
- **Audio:** MP3, WAV, M4A

#### Optimization Features
- Automatic format conversion (WebP when supported)
- Quality optimization
- Responsive sizing with width limits
- Aspect ratio preservation

### 5.5 Admin Dashboard

**Route:** `/admin`

**Statistics Displayed:**
- Total user count
- Total product count
- Total memory count
- Total storage used

**Management Capabilities:**
- View all products with user assignments
- Create new products for users
- Copy product tokens to clipboard
- Copy guest tokens for sharing

---

## 6. API Routes & Server Actions

### Server Actions

#### `app/actions/auth.ts`

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `authenticate` | FormData | Redirect | Email/password login |
| `registerUser` | FormData | Redirect | Create new account |
| `logout` | - | Redirect | Sign out user |
| `updateProfile` | FormData | - | Update user profile |

#### `app/actions/memories.ts`

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `createMemory` | FormData | Redirect | Create memory with media |
| `getMemories` | productId? | Memory[] | Fetch user memories |
| `getMemory` | id | Memory | Get single memory |
| `updateMemory` | id, FormData | Redirect | Update memory |
| `deleteMemory` | id | Redirect | Delete memory + cleanup |
| `deleteProduct` | id | Redirect | Delete charm + memories |
| `getUserProducts` | - | Product[] | Get user's products |
| `getProductIdFromToken` | token | string | Lookup product |

#### `app/actions/guest.ts`

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `loginGuest` | token | Redirect | Validate & set session |
| `getGuestSession` | - | Session | Get current session |
| `logoutGuest` | - | Redirect | Clear session |
| `createGuestMemory` | FormData | Redirect | Create as guest |
| `getGuestMemories` | - | Memory[] | Get product memories |
| `addGuestMedia` | id, media[] | Success | Add media to memory |

#### `app/actions/admin.ts`

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getAdminStats` | - | Stats | Dashboard metrics |
| `createProduct` | email, name | Product | Create NFC product |
| `getProducts` | - | Product[] | List all products |

#### `app/actions/upload.ts`

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getCloudinarySignature` | - | SignedParams | Get upload signature |
| `deleteUploadedFile` | url | Success | Delete from Cloudinary |

### API Routes

#### `app/api/auth/[...nextauth]/route.ts`
- NextAuth dynamic route handlers
- Exports GET and POST handlers
- Force dynamic rendering

#### `app/api/upload/sign/route.ts`
- POST endpoint for Cloudinary signatures
- Validates user authentication
- Returns signed upload parameters

---

## 7. Cloudinary Integration

### Configuration

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
```

### Upload Signing

```typescript
// Generate signed upload parameters
const timestamp = Math.round(new Date().getTime() / 1000);
const signature = cloudinary.utils.api_sign_request(
  { timestamp, upload_preset: 'candyd' },
  process.env.CLOUDINARY_API_SECRET
);
```

### Media URL Optimization

```typescript
// lib/media-helper.ts
function getOptimizedUrl(url: string, options?: OptimizeOptions): string {
  // Transform Cloudinary URLs for optimization
  // - f_auto: Automatic format selection
  // - q_auto: Automatic quality
  // - w_800: Width limit
  // - c_limit: Scale down only
}
```

### Cleanup Process

```typescript
// Delete file from Cloudinary
async function deleteUploadedFile(url: string) {
  const publicId = extractPublicId(url);
  const resourceType = determineResourceType(url);
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
```

---

## 8. UI Components & Pages

### Core Components

#### AppHeader (`app/components/AppHeader.tsx`)

The main navigation header component.

**Features:**
- Displays greeting with current date
- Menu dropdown with navigation links
- Charm selector for filtering memories
- Product switching with visual feedback
- Logout functionality
- Responsive design

#### HomeContent (`app/components/home-content.tsx`)

The main memory display component.

**Features:**
- Grid view with center-out fill animation
- List view with masonry layout
- Drag-to-navigate grid interaction
- Search and filter bar
- View mode toggle
- Distance-based card animations
- Audio player integration
- Empty state handling

#### MemoryDrawer (`components/memory-drawer.tsx`)

Slide-up detail view for memories.

**Features:**
- Title and description display
- Metadata (date, time, location)
- Media gallery (images, videos, audio)
- Edit button (authenticated users only)
- Guest media upload button
- Smooth animations

#### AudioPlayer (`app/components/AudioPlayer.tsx`)

Custom HTML5 audio player.

**Features:**
- Play/pause controls
- Progress visualization
- Custom styling
- Memory grid integration

### Page Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Home page with memory grid |
| `/login` | `app/login/page.tsx` | User login form |
| `/register` | `app/register/page.tsx` | User registration |
| `/upload-memory` | `app/upload-memory/page.tsx` | Create new memory |
| `/memory/[id]` | `app/memory/[id]/client.tsx` | Edit existing memory |
| `/manage-charms` | `app/manage-charms/page.tsx` | Charm management |
| `/nfc/login` | `app/nfc/login/page.tsx` | NFC authentication |
| `/guest/login` | `app/guest/login/page.tsx` | Guest access entry |
| `/guest/memories` | `app/guest/memories/page.tsx` | Guest memory view |
| `/admin` | `app/admin/page.tsx` | Admin dashboard |
| `/settings` | `app/settings/page.tsx` | User settings |
| `/help` | `app/help/page.tsx` | Help documentation |

---

## 9. State Management

### Client-Side State

**React Hooks Used:**

| Hook | Purpose |
|------|---------|
| `useState` | Form inputs, UI toggles, modals |
| `useRef` | File inputs, scroll containers, upload refs |
| `useTransition` | Server action loading states |
| `useContext` | AuthContext for session data |
| `useActionState` | Form submission with server actions |

### Server State

- **Database:** PostgreSQL via Prisma ORM
- **Queries:** Server actions with direct DB access
- **Cache:** `revalidatePath` for invalidation after mutations

### Session State

- **JWT Tokens:** Stored in HTTP-only cookies
- **Server Access:** `auth()` function returns session
- **Client Access:** AuthContext provider

### State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     STATE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Client     │    │    Server    │    │   Database   │   │
│  │    State     │───>│   Actions    │───>│  (Prisma)    │   │
│  │  (useState)  │<───│              │<───│              │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                               │
│         │            ┌──────┴──────┐                        │
│         └───────────>│   Session   │                        │
│                      │  (NextAuth) │                        │
│                      └─────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Special Features

### 10.1 Center-Out Grid Layout

The memory grid fills from the center outward, providing an intuitive browsing experience.

**Implementation:**
- Calculate center position of grid
- Sort memories by distance from center
- Apply scale and opacity based on proximity
- Drag-to-navigate interaction

### 10.2 Emotion/Event/Mood System

Flexible tagging system for memory categorization.

**Pre-defined Emotions:**
- Happy, Sad, Excited, Nostalgic, Grateful, etc.

**Pre-defined Events (Wedding-themed):**
- Haldi, Sangeet, Reception, Ceremony, etc.

**Pre-defined Moods:**
- Joyful, Peaceful, Romantic, Festive, etc.

**Custom Input:**
- Users can add custom tags for each category

### 10.3 Media Reordering

Drag-and-drop media ordering on edit page.

**Features:**
- Drag handle on each media item
- Auto-scroll during drag
- Order index persisted to database
- First item marked as "COVER"

### 10.4 Guest Features

**Capabilities:**
- Separate login flow with token validation
- Cookie-based session management
- View product's memories
- Upload new memories with attribution
- Add media to existing memories

**Restrictions:**
- Cannot edit memories
- Cannot delete memories
- Limited to single product

### 10.5 NFC Integration

**Physical Product Flow:**
1. NFC chip programmed with product token URL
2. User taps phone to product
3. Browser opens `/nfc/login?token=...`
4. Auto-authentication with associated account
5. Redirect to filtered memory view

---

## 11. Configuration Files

### Environment Variables (`.env`)

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Authentication
AUTH_SECRET="auto-generated-secret"
```

### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration options
};

export default nextConfig;
```

### tailwind.config.ts

```typescript
// Custom theme configuration
theme: {
  extend: {
    colors: {
      'primary-purple': '#5B2D7D',
      // Additional custom colors
    }
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "preserve",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 12. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.x | Framework & server runtime |
| `react` | 19.x | UI library |
| `@prisma/client` | 7.1.0 | Database ORM |
| `next-auth` | v5 | Authentication |
| `bcryptjs` | - | Password hashing |
| `cloudinary` | - | Media storage & API |
| `motion` | - | Animations (Framer Motion) |
| `zod` | - | Schema validation |
| `sonner` | - | Toast notifications |
| `lucide-react` | - | Icon library |
| `@radix-ui/react-dialog` | - | Accessible dialog |
| `tailwindcss` | 4.x | CSS framework |
| `class-variance-authority` | - | CSS-in-JS utility |

---

## 13. Security Measures

### Authentication Security

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcryptjs with 10 salt rounds |
| Session Tokens | JWT with HTTP-only cookies |
| Token Expiration | Configurable session lifetime |

### Authorization Security

| Measure | Implementation |
|---------|----------------|
| Route Protection | Middleware checks authentication |
| Ownership Verification | All operations check user ownership |
| Role-Based Access | ADMIN role required for admin routes |
| Guest Isolation | Separate cookie-based sessions |

### Data Security

| Measure | Implementation |
|---------|----------------|
| SQL Injection Prevention | Prisma parameterized queries |
| CORS Protection | Same-origin middleware |
| Media Cleanup | Files deleted on record removal |

---

## 14. Deployment Considerations

### Infrastructure

| Component | Service |
|-----------|---------|
| Database | Neon PostgreSQL (serverless) |
| Media Storage | Cloudinary CDN |
| Hosting | Vercel (recommended) |

### Build Process

```bash
# Production build
npm run build  # Includes prisma generate

# Required environment variables
DATABASE_URL
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
AUTH_SECRET
```

### Performance Optimizations

- Server components for initial render
- Dynamic imports for heavy components
- Image optimization via Cloudinary
- Incremental static regeneration where applicable

---

## 15. Development Workflow

### Available Scripts

```bash
# Development
npm run dev        # Start development server (port 3000)

# Production
npm run build      # Build for production
npm start          # Start production server

# Code Quality
npm run lint       # Run ESLint
```

### Database Commands

```bash
# Migrations
npx prisma migrate dev     # Create and apply migrations
npx prisma migrate deploy  # Apply migrations in production

# Development Tools
npx prisma studio          # Open database GUI
npx prisma db push         # Push schema changes (dev only)
npx prisma generate        # Regenerate Prisma client
```

### Git Workflow

```bash
# Recent commits show pattern:
# "Check #N" - Incremental development checkpoints
# Feature-based commits for significant changes
```

---

## 16. Known Patterns & Best Practices

### Server Actions

- Centralized business logic in `app/actions/`
- Authentication checks at start of each action
- Return structured responses with success/error
- Use `revalidatePath` after mutations

### Form Handling

```typescript
// Pattern: useActionState with server actions
const [state, formAction, isPending] = useActionState(serverAction, initialState);
```

### Loading States

```typescript
// Pattern: useTransition for pending UI
const [isPending, startTransition] = useTransition();
startTransition(() => {
  // Trigger server action
});
```

### Error Handling

- Try-catch in all server actions
- Toast notifications for user feedback
- Structured error responses

### Media Management

- Refs track upload promises
- Database stores final Cloudinary URLs
- Cleanup on record deletion

### Animations

```typescript
// Pattern: Motion library with layout animations
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  layoutId={uniqueId}
/>
```

### Type Safety

- TypeScript throughout codebase
- Zod schemas for validation
- Prisma generates typed client

---

## Appendix: Quick Reference

### Routes Cheat Sheet

| Action | Route |
|--------|-------|
| Login | `/login` |
| Register | `/register` |
| View Memories | `/` |
| Create Memory | `/upload-memory` |
| Edit Memory | `/memory/{id}` |
| Manage Charms | `/manage-charms` |
| NFC Login | `/nfc/login?token={token}` |
| Guest Login | `/guest/login?token={token}` |
| Guest View | `/guest/memories` |
| Admin Dashboard | `/admin` |

### Server Action Imports

```typescript
// Authentication
import { authenticate, registerUser, logout } from '@/app/actions/auth';

// Memory operations
import { createMemory, getMemories, updateMemory, deleteMemory } from '@/app/actions/memories';

// Guest operations
import { loginGuest, createGuestMemory, getGuestMemories } from '@/app/actions/guest';

// Admin operations
import { getAdminStats, createProduct, getProducts } from '@/app/actions/admin';

// Upload operations
import { getCloudinarySignature, deleteUploadedFile } from '@/app/actions/upload';
```

---

*Documentation generated for Candyd NFC v2 - A Next.js 16 memory management application with NFC product integration.*
