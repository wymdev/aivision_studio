# Project Architecture Overview

## Service Layer Architecture

This project follows a clean architecture pattern with clear separation of concerns:

### Layers:

1. **Repository Layer** (`src/repositories/`)
   - Handles all data access (API calls, database queries)
   - Examples: `UserRepository`, `RoboflowRepository`
   - Provides CRUD operations and data fetching logic

2. **Service Layer** (`src/services/`)
   - Contains business logic and data transformation
   - Examples: `UserService`, `RoboflowService`
   - Calls repositories and processes data

3. **Store Layer** (`src/store/`)
   - Zustand state management stores
   - Examples: `useAuthStore`, `useUserStore`, `useDetectionStore`
   - Manages application state with reactive updates

4. **Hook Layer** (`src/hooks/`)
   - Custom React hooks that combine services and stores
   - Examples: `useAuth`, `useUsers`, `useRoboflowDetection`
   - Provides clean API for components

5. **Component Layer** (`app/`, `src/components/`)
   - UI components and pages
   - Uses hooks for data and logic
   - Focuses purely on presentation

## Data Flow

```
User Interaction
      ↓
   Component
      ↓
  Custom Hook (useRoboflowDetection)
      ↓
  Zustand Store (useDetectionStore)
      ↓
    Service (RoboflowService)
      ↓
  Repository (RoboflowRepository)
      ↓
   External API (Roboflow)
```

## Example: Object Detection Flow

1. **User uploads image** in `VisualizePage` component
2. Component calls `useRoboflowDetection().uploadImage(file)`
3. Hook updates `useDetectionStore` with image data
4. User clicks "Analyze"
5. Hook calls `roboflowService.detectObjects(file)`
6. Service uses `roboflowRepository.detectObjects()` to call API
7. Results flow back through service → hook → store
8. Component reactively re-renders with new data

## State Management with Zustand

### Why Zustand?

- **Lightweight**: Only 1KB minified + gzipped
- **No Provider**: No context wrapper needed
- **TypeScript**: Full type safety
- **Persist**: Built-in localStorage persistence
- **Selective Updates**: Components only re-render when their data changes

### Store Structure

```typescript
// Create a store
export const useDetectionStore = create<DetectionState>((set, get) => ({
  // State
  uploadedImage: null,
  detectionResult: null,
  
  // Actions
  setUploadedImage: (image, file) => set({ uploadedImage: image }),
  
  // Computed values
  getFilteredPredictions: () => {
    const state = get();
    return state.detectionResult?.predictions.filter(...);
  }
}));

// Use in components
function MyComponent() {
  const { uploadedImage, setUploadedImage } = useDetectionStore();
  // Component re-renders only when uploadedImage changes
}
```

## Environment Configuration

Configuration is managed through environment variables and config files:

- `.env` - Local environment variables (not committed)
- `.env.example` - Template for environment variables
- `src/config/` - TypeScript config files that read from env vars

## Type Safety

All data structures are defined in `src/types/`:

- `user.types.ts` - User and authentication types
- `api.types.ts` - API request/response types
- `roboflow.types.ts` - Roboflow detection types

This ensures end-to-end type safety from API to UI.

## Component Organization

- `src/components/ui/` - Reusable shadcn/ui components
- `src/components/features/` - Feature-specific components
- `app/` - Page components using Next.js App Router

## Benefits of This Architecture

1. **Testability**: Each layer can be tested independently
2. **Maintainability**: Changes are isolated to specific layers
3. **Scalability**: Easy to add new features following the same pattern
4. **Type Safety**: TypeScript ensures correctness across all layers
5. **Reusability**: Services and repositories can be used by multiple components
6. **Performance**: Zustand ensures minimal re-renders
