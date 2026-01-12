# Next.js 15 Production Project Setup Instructions

## Project Overview
Production-ready Next.js 15 application with TypeScript, service layer architecture, Zustand state management, and shadcn/ui.

## Setup Checklist

- [x] Create copilot-instructions.md file
- [x] Initialize Next.js 15 project with TypeScript and Tailwind
- [x] Create service layer architecture (Repository-Service pattern)
- [x] Set up Zustand state management stores
- [x] Initialize shadcn/ui components
- [x] Create App Router structure with route groups
- [x] Add configuration files
- [x] Install dependencies and compile project

## Project Structure
```
my-nextjs-app/
├── app/                          # App Router (Next.js 15)
│   ├── (auth)/                   # Route groups for authentication
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx
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
│   ├── repositories/             # Data access layer
│   ├── lib/                      # Utilities & helpers
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand stores
│   ├── types/                    # TypeScript definitions
│   └── config/                   # App configuration
├── public/                       # Static assets
```

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Patterns
- **State Management**: Zustand (lightweight, fast, no providers needed)
- **Service Layer**: Controller-Service-Repository pattern
- **Routing**: Next.js 15 App Router with file-based routing
- **UI**: shadcn/ui + Tailwind CSS for responsive design
