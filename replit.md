# SAT Duel

## Overview

SAT Duel is a real-time multiplayer quiz game for SAT practice. Players create or join game rooms using unique codes, compete head-to-head answering SAT questions across Math, Reading, and Writing categories, and track scores in real-time. The application balances competitive gaming elements with educational credibility, inspired by platforms like Kahoot and Quizlet Live.

**Core Features:**
- Room-based multiplayer gameplay with unique room codes
- Real-time question progression and score tracking
- SAT question bank covering Math, Reading, and Writing
- Responsive design optimized for both desktop and mobile

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- File-based routing with single-page application architecture

**UI Component System:**
- Shadcn/ui component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming with light/dark mode support
- Custom spacing primitives and responsive breakpoints following design guidelines

**State Management:**
- React hooks for local component state
- TanStack Query (React Query) for server state and caching
- Custom `useGameRoom` hook for Firebase Realtime Database integration
- Local storage for persistent player ID generation

**Design System:**
- Typography: Inter/DM Sans primary fonts with Space Grotesk for headers
- Layout: Max-width containers (max-w-4xl for gameplay, max-w-md for lobby)
- Component variants: Primary, secondary, destructive, outline, and ghost buttons
- Consistent spacing using Tailwind's 2/4/6/8 unit scale

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- Node.js with ES modules (type: "module")
- TypeScript compilation with tsx for development

**Development Setup:**
- Vite middleware integration for HMR in development
- Separate production build process bundling with esbuild
- Custom logging middleware for API request tracking
- Static file serving for production builds

**Data Layer:**
- In-memory storage implementation (`MemStorage`) with interface-based design
- Storage interface (`IStorage`) defining CRUD operations for future database migration
- User management with UUID-based identification
- Designed for easy swapping to persistent database (PostgreSQL/Drizzle configured but not actively used)

### Real-Time Synchronization

**Firebase Realtime Database:**
- Real-time game room state synchronization
- Room data structure tracking players, scores, current question, and game state
- Event-driven updates using Firebase's `onValue` listeners
- Room lifecycle management (create, join, leave, cleanup)

**Game State Flow:**
1. Lobby: Players create or join rooms with 4-digit codes
2. Waiting: Host waits for second player to join
3. Playing: Real-time question display with answer submission
4. Game Over: Final score display with replay options

### Data Schema

**Question Schema (Zod-validated):**
- Fixed structure: question text, 4 choices, correct answer index, optional category
- Static question bank loaded from `shared/questions.json`
- Categories: Math, Reading, Writing

**Game Room Schema:**
- Room ID (4-digit code)
- Player array (maximum 2 players)
- Current question index
- Started flag
- Score tracking per player

**Player Management:**
- Client-generated UUID stored in localStorage
- Anonymous gameplay without authentication
- Player identification by unique ID across sessions

## External Dependencies

### Third-Party Services

**Firebase Realtime Database:**
- Purpose: Real-time game state synchronization between players
- Configuration: Stored in `client/src/lib/firebaseConfig.ts`
- Required: User must provide their own Firebase project credentials
- SDK: Firebase Web SDK v11.0.0

**Google Fonts:**
- Fonts loaded: DM Sans, Architects Daughter, Fira Code, Geist Mono
- Delivery: CDN via Google Fonts API
- Usage: Typography system as defined in design guidelines

### Database Configuration

**Drizzle ORM (Configured but Inactive):**
- PostgreSQL dialect configured via `drizzle.config.ts`
- Schema definition: `shared/schema.ts`
- Migrations directory: `./migrations`
- Connection: Expects `DATABASE_URL` environment variable
- Note: Currently using in-memory storage; PostgreSQL integration prepared for future use

**Neon Serverless:**
- PostgreSQL connection library included in dependencies
- Ready for activation when transitioning from in-memory to persistent storage

### UI Component Libraries

**Radix UI:**
- Comprehensive suite of unstyled, accessible components
- Installed primitives: Dialog, Dropdown Menu, Toast, Tooltip, Accordion, Tabs, and 20+ others
- Customized through Shadcn/ui wrapper components

**Supporting Libraries:**
- `class-variance-authority`: Component variant management
- `clsx` + `tailwind-merge`: Utility class composition
- `lucide-react`: Icon library
- `embla-carousel-react`: Carousel functionality (installed but may not be actively used)
- `cmdk`: Command palette component

### Development Tools

**Replit-Specific Plugins:**
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Code mapping
- `@replit/vite-plugin-dev-banner`: Development environment indicator