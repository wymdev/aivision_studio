# Stock Vision Admin

A **stunning AI-powered object detection application** built with Next.js 15, featuring a beautiful, modern interface with real-time Roboflow AI integration.

## ✨ Live Demo

Visit the homepage and immediately start detecting objects - no navigation needed! Just upload an image and watch the AI work its magic.

## 🎨 Beautiful UI Features

### Modern Design
- **Gradient backgrounds** with animated blobs
- **Glass-morphism effects** for depth and elegance  
- **Smooth animations** throughout the interface
- **Color-coded detections** with glow effects
- **Responsive design** that works on all devices

### Interactive Elements
- **Drag & drop** image upload with visual feedback
- **Real-time canvas rendering** with animated bounding boxes
- **Live label toggles** to show/hide specific object classes
- **Search functionality** to filter detection results
- **Instant statistics** showing detection count and processing time

## 🚀 Features

### 🎯 Object Detection (Homepage)
The application launches directly into the object detection interface featuring:

- **3-Column Smart Layout**
  - **Left Column**: Upload controls + detection statistics + interactive label filters
  - **Middle Column**: Live annotated image with color-coded bounding boxes and glow effects
  - **Right Column**: JSON results with search and detailed detection data
  
- **Advanced Visual Design**
  - Animated gradient backgrounds
  - Glass-morphism UI elements
  - Smooth transitions and hover effects
  - Color-coded detections with shadows
  - Responsive grid layout

- **Interactive Detection Controls**
  - Toggle visibility for each detected object class
  - Show/hide all labels with one click
  - Real-time canvas rendering
  - Detection statistics (count, confidence, processing time)
  - Search and filter JSON results

### Core Features
- **Next.js 15** with App Router for optimal performance
- **TypeScript** for type-safe development
- **Zustand** lightweight state management (1KB)
- **Service Layer Architecture** with Repository-Service pattern
- **shadcn/ui** + **Tailwind CSS** for beautiful, responsive UI
- **Roboflow API Integration** for real-time object detection

## 📁 Project Structure

```
stock-vision-admin/
├── app/                          # App Router (Next.js 15)
│   ├── (auth)/                   # Route groups for authentication
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── visualize/                # 🎯 Roboflow object detection page
│   │   └── page.tsx
│   ├── api/                      # API routes
│   │   └── users/
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Global styles
├── src/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   └── features/             # Feature-specific components
│   ├── services/                 # Business logic layer
│   │   ├── roboflow.service.ts  # 🎯 Roboflow API integration
│   │   ├── user.service.ts
│   │   └── api.service.ts
│   ├── repositories/             # Data access layer
│   │   ├── user.repository.ts
│   │   └── base.repository.ts
│   ├── lib/                      # Utilities & helpers
│   │   ├── utils.ts
│   │   └── api-client.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useUsers.ts
│   ├── store/                    # Zustand stores
│   │   ├── useAuthStore.ts
│   │   └── useUserStore.ts
│   ├── types/                    # TypeScript definitions
│   │   ├── roboflow.types.ts    # 🎯 Roboflow type definitions
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   ├── config/                   # App configuration
│   │   └── roboflow.config.ts   # 🎯 Roboflow configuration
│   └── config/                   # App configuration
└── public/                       # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **State Management**: Zustand with persist middleware
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **AI/ML**: Roboflow API for object detection
- **Architecture**: Controller-Service-Repository pattern

## 🏃 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Roboflow API account and credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Configure Environment Variables**:

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update `.env` with your Roboflow credentials:
```env
NEXT_PUBLIC_ROBOFLOW_API_URL=https://serverless.roboflow.com/YOUR_PROJECT/VERSION
NEXT_PUBLIC_ROBOFLOW_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser
**🎉 The object detection interface loads immediately - no navigation needed!**
### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🎯 Using the Object Detection Feature

**The detection interface is now your homepage!** Simply:

1. **Open the app** - Detection UI loads immediately
2. **Upload an image** via drag & drop or click to browse
3. **Click "Analyze Image"** to send to Roboflow AI
4. **View results** across 3 columns:
   - **Left**: Control panel with label toggles and stats
   - **Middle**: Annotated image with beautiful bounding boxes
   - **Right**: Searchable JSON detection data

### Interactive Features:
- ✅ Real-time object detection with AI
- ✅ **Beautiful animated UI** with gradients and glass-morphism
- ✅ Interactive label toggles (show/hide specific classes)
- ✅ **Color-coded bounding boxes** with glow effects
- ✅ Confidence scores for each detection
- ✅ JSON search functionality
- ✅ **Instant statistics** (total count, processing time)
- ✅ Drag & drop upload with visual feedback

## 📚 Architecture

### Service Layer Pattern

The project follows a clean architecture with separation of concerns:

- **Repositories** - Data access layer (API calls, database queries)
- **Services** - Business logic layer (validation, transformation)
- **Controllers** - Request handling (API routes, server actions)

Example usage:

```typescript
// Repository
export class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    // Data access logic
  }
}

// Service
export class UserService {
  async getUserProfile(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    return this.transformUserData(user);
  }
}
```

### State Management with Zustand

Simple, fast, and scalable state management:

```typescript
// Create a store
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);

// Use in components
const { user, login, logout } = useAuthStore();
```

### Routing

File-based routing with App Router:

- `app/page.tsx` → `/`
- `app/login/page.tsx` → `/login`
- `app/(dashboard)/page.tsx` → `/dashboard`
- `app/api/users/route.ts` → `/api/users`

Route groups `(auth)` and `(dashboard)` organize routes without affecting URLs.

## 🎨 UI Components

Built with shadcn/ui for customizable, accessible components:

```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

<Button variant="default">Click me</Button>
<Card>Content</Card>
```

All components are copied into your project for full control and customization.

## 🔐 Authentication

Example authentication flow using Zustand:

```typescript
import { useAuth } from "@/hooks/useAuth";

function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  
  const handleSubmit = async (email, password) => {
    await login(email, password);
  };
}
```

## 📝 API Routes

API routes in `app/api/`:

```typescript
// app/api/users/route.ts
export async function GET(request: NextRequest) {
  const users = await fetchUsers();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newUser = await createUser(body);
  return NextResponse.json(newUser, { status: 201 });
}
```

## 🚀 Deployment

Build the project for production:

```bash
npm run build
```

The app is optimized for deployment on Vercel, but works with any Node.js hosting platform.

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

ISC

---

Built with ❤️ using Next.js 15, TypeScript, Zustand, and shadcn/ui
