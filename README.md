# Candyd NFC

A web application for creating and storing memories linked to physical NFC products. Tap your NFC-enabled product to instantly access and add memories.

## Features

- **NFC Product Linking** - Associate physical NFC products with your account using unique tokens
- **Memory Creation** - Store memories with titles, descriptions, dates, locations, emotions, and mood
- **Media Uploads** - Attach photos and videos to memories via Cloudinary
- **Interactive Memory Grid** - Browse memories with smooth animations and filtering
- **Token-Based Access** - Tap an NFC product to authenticate and view associated memories
- **Admin Dashboard** - Manage products, view user stats, and create new NFC tokens

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (JWT sessions)
- **Media Storage**: Cloudinary
- **Styling**: Tailwind CSS 4
- **Animations**: Motion (Framer Motion)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon cloud PostgreSQL)
- Cloudinary account (for media uploads)

### Environment Variables

Create a `.env` file with:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Installation

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
app/
├── actions/       # Server actions (auth, memories, admin)
├── api/           # Route handlers (auth, upload signing)
├── components/    # Shared React components
├── admin/         # Admin dashboard
├── login/         # Authentication pages
├── register/
├── upload-memory/ # Memory creation
└── nfc/           # NFC token-based login
lib/               # Utilities (db client, auth context, cloudinary)
prisma/            # Database schema and migrations
```
