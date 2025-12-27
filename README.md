# Candyd NFC 🍬

**Candyd NFC** is a sophisticated web application that bridges the physical and digital worlds. By linking NFC-enabled "Charms" to a powerful digital platform, users can store, organize, and relive their most cherished memories, or track life goals through interactive bucket lists.

Built with **Next.js 16**, **PostgreSQL**, and **NextAuth v5**, it features a seamless "tap-to-authenticate" flow, allowing physical objects to act as secure keys to digital content.

---

## 🌟 Key Features

### 1. Memory Charms (The Core Experience)
Turn any object into a time capsule.
- **Rich Media Support:** Upload Photos, Videos, and Audio recordings.
- **Detailed Metadata:** Tag memories with specific **Emotions**, **Moods**, **Locations**, and **Events** (e.g., "Wedding", "Travel").
- **Center-Out Grid:** A unique, physics-based grid layout that animates memories based on proximity.
- **Media Reordering:** Drag-and-drop interface to organize how media appears in a memory.

### 2. Life Charms (Bucket Lists) 🆕
A dedicated experience for tracking life goals and aspirations.
- **Status Tracking:** Mark items as **"Pending"** or **"Lived"**.
- **Experience Logging:** When a goal is "Lived", attach media and reflections to capture the moment of achievement.
- **Graduation:** Complete a Life Charm to "Graduate" it, locking it as a completed chapter of life.
- **Visual Progress:** Dynamic progress bars and filtering systems.

### 3. NFC & Authentication System
- **Tap-to-Login:** Users can tap their physical NFC charm to instantly log in and filter their view to that specific product.
- **Standard Auth:** Traditional Email/Password login via NextAuth.
- **Security:** Secure, HTTP-only session management.

### 4. Guest Access System 🤝
Share memories without compromising security.
- **Shareable Links:** Generate unique, tokenized links for specific charms.
- **Restricted Access:** Guests can view content and upload *new* memories (with attribution) but cannot edit or delete existing ones.
- **Session Isolation:** Guest sessions are strictly sandboxed to the shared product.

### 5. Admin Dashboard
- **Product Management:** Generate and assign new NFC tokens.
- **System Stats:** Monitor user growth, storage usage, and active products.
- **Token Management:** Copy/Paste functionality for programming physical NFC tags.

---

## 🛠️ Tech Stack

| Category | Technology | Description |
|----------|------------|-------------|
| **Framework** | Next.js 16 | App Router, Server Actions, React 19 |
| **Database** | PostgreSQL | Hosted on Neon (recommended) |
| **ORM** | Prisma 7.x | Type-safe database access |
| **Auth** | NextAuth.js v5 | Credentials & Custom Token Providers |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Animation** | Framer Motion | Complex UI transitions |
| **Media** | Cloudinary | Asset storage, optimization, and transformation |
| **Validation** | Zod | Runtime schema validation |
| **UI** | Radix UI | Accessible component primitives |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL Database**
- **Cloudinary Account** (for media storage)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/candyd-nfc.git
cd candyd-nfc
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth Configuration
AUTH_SECRET="your-generated-secret-key" # Run `npx auth secret` to generate

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Database Setup
Initialize the database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Run Migrations
npx prisma migrate dev --name init
```

### 4. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to see the app.

---

## 📂 Project Architecture

The project follows the Next.js App Router structure:

```
candyd-nfc/
├── app/
│   ├── actions/          # Server Actions (Backend Logic)
│   │   ├── auth.ts       # Authentication & Registration
│   │   ├── memories.ts   # Memory CRUD
│   │   ├── life-charm.ts # Bucket List Logic
│   │   └── guest.ts      # Guest Session Handling
│   ├── api/              # Minimal API Routes (Auth/Uploads)
│   ├── life-charm/       # Life Charm Feature Routes
│   ├── guest/            # Guest Interface Routes
│   ├── nfc/              # NFC Redirect Handler
│   └── ...               # Standard Pages (Login, Home, etc.)
├── components/           # Reusable UI Components
├── lib/                  # Utilities (DB, Cloudinary, Helpers)
└── prisma/               # Database Schema
```

---

## 📖 Usage Guide

### For Users
1.  **Register** an account.
2.  **Add a Product:** (Currently done via Admin, or simulated in dev).
3.  **Create Memories:** Click the "+" button, upload media, and tag details.
4.  **Life Lists:** Navigate to a Life Charm to start adding bucket list items.

### For Admins
1.  Navigate to `/admin`.
2.  **Create Product:** Enter a user's email and product name.
3.  **Get Token:** Copy the "NFC Token" link.
4.  **Program Tag:** Write the link `https://your-domain.com/nfc/login?token=[TOKEN]` to an NFC tag.

### For Guests
1.  Receive a guest link (`/guest/login?token=...`).
2.  Access the shared charm to view memories.
3.  Upload photos/videos from your perspective.

---

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.