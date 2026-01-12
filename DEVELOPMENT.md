# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Roboflow API credentials

# Run development server
npm run dev

# Visit http://localhost:3000
```

## Project Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |

## Adding New Features

### 1. Add a New API Integration

```typescript
// 1. Create types (src/types/myfeature.types.ts)
export interface MyFeatureData {
  id: string;
  name: string;
}

// 2. Create repository (src/repositories/myfeature.repository.ts)
export class MyFeatureRepository {
  async fetchData(): Promise<MyFeatureData[]> {
    return apiClient.get('/myfeature');
  }
}

// 3. Create service (src/services/myfeature.service.ts)
export class MyFeatureService {
  constructor(private repo: MyFeatureRepository) {}
  
  async processData() {
    const data = await this.repo.fetchData();
    return this.transform(data);
  }
}

// 4. Create Zustand store (src/store/useMyFeatureStore.ts)
export const useMyFeatureStore = create<MyFeatureState>((set) => ({
  data: [],
  setData: (data) => set({ data })
}));

// 5. Create hook (src/hooks/useMyFeature.ts)
export function useMyFeature() {
  const { data, setData } = useMyFeatureStore();
  
  const loadData = async () => {
    const result = await myFeatureService.processData();
    setData(result);
  };
  
  return { data, loadData };
}

// 6. Use in component
function MyComponent() {
  const { data, loadData } = useMyFeature();
  
  useEffect(() => {
    loadData();
  }, []);
  
  return <div>{data.map(item => ...)}</div>;
}
```

### 2. Add a New Page

```bash
# Create page file
# app/mypage/page.tsx

export default function MyPage() {
  return <div>My Page</div>;
}

# Auto-routed to /mypage
```

### 3. Add a New shadcn/ui Component

```bash
# Option 1: Add from shadcn/ui registry (if available)
npx shadcn@latest add dialog

# Option 2: Create manually in src/components/ui/
```

## Zustand State Management

### Creating a Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyStore {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyStore>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }))
    }),
    { name: 'my-storage' } // Persists to localStorage
  )
);
```

### Using a Store

```typescript
// Get entire store
const { count, increment } = useMyStore();

// Get specific values (component only re-renders when count changes)
const count = useMyStore((state) => state.count);

// Get action only (no re-renders)
const increment = useMyStore((state) => state.increment);
```

## TypeScript Tips

### Defining Component Props

```typescript
interface MyComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  optional?: boolean;
}

export function MyComponent({ title, onSubmit, optional = false }: MyComponentProps) {
  // ...
}
```

### Type-safe API Calls

```typescript
// Define response type
interface ApiResponse {
  data: User[];
  total: number;
}

// Type the function
async function fetchUsers(): Promise<ApiResponse> {
  return apiClient.get<ApiResponse>('/users');
}

// Use with type safety
const response = await fetchUsers();
response.data // TypeScript knows this is User[]
```

## Tailwind CSS

### Using Theme Colors

```typescript
// These map to your theme in globals.css
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">
<Card className="bg-card border-border">
```

### Responsive Design

```typescript
// Mobile first approach
<div className="
  text-sm      // default (mobile)
  md:text-base // medium screens and up
  lg:text-lg   // large screens and up
">
```

## API Routes

### Creating an API Route

```typescript
// app/api/myroute/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const data = { message: 'Hello' };
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Process body
  return NextResponse.json({ success: true });
}

// Auto-routed to /api/myroute
```

## Environment Variables

### Adding New Environment Variables

1. Add to `.env`:
```env
NEXT_PUBLIC_MY_VAR=value
```

2. Add to `.env.example`:
```env
NEXT_PUBLIC_MY_VAR=your_value_here
```

3. Use in code:
```typescript
const myVar = process.env.NEXT_PUBLIC_MY_VAR;
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Common Patterns

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

async function loadData() {
  setIsLoading(true);
  try {
    const data = await fetchData();
    setData(data);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
}

return isLoading ? <Spinner /> : <DataDisplay />;
```

### Form Handling

```typescript
function MyForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };
    await submitData(data);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input name="name" required />
      <Input name="email" type="email" required />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

## Debugging

### React DevTools
Install React DevTools browser extension to inspect component tree and state.

### Zustand DevTools
```typescript
import { devtools } from 'zustand/middleware';

export const useMyStore = create<MyStore>()(
  devtools(
    (set) => ({
      // your store
    }),
    { name: 'MyStore' }
  )
);
```

### Next.js Error Overlay
Development server shows detailed error messages with stack traces.

## Best Practices

1. **Keep components small** - Break down large components
2. **Use TypeScript strictly** - Don't use `any`
3. **Follow naming conventions**:
   - Components: PascalCase (`MyComponent`)
   - Files: kebab-case (`my-component.tsx`)
   - Hooks: camelCase with `use` prefix (`useMyHook`)
4. **Colocate related files** - Keep types, services, and components together
5. **Write reusable code** - Extract common logic into hooks and utilities
6. **Use meaningful names** - Be descriptive and clear
7. **Handle errors** - Always have try-catch for async operations
8. **Test your code** - Write tests for critical functionality

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Getting Help

- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
