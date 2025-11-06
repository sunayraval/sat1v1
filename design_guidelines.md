# SAT Duel - Design Guidelines

## Design Approach
**Selected Approach:** Reference-based hybrid drawing from competitive educational gaming platforms (Kahoot, Quizlet Live) + modern productivity apps (Linear, Notion) for clean information hierarchy.

**Core Principle:** Balance playful competition with academic credibility - engaging without being distracting, competitive without being overwhelming.

## Typography System

**Primary Font:** Inter or DM Sans (Google Fonts CDN)
**Secondary/Display:** Space Grotesk for headers (optional accent)

**Hierarchy:**
- H1 (Game Title): 2.5rem (text-4xl), font-bold, tracking-tight
- H2 (State Headers): 1.875rem (text-3xl), font-semibold
- Question Text: 1.25rem (text-xl), font-medium, max-w-2xl for readability
- Body/UI Text: 1rem (text-base), font-normal
- Small Text (Room codes, status): 0.875rem (text-sm), font-medium

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8, etc.)
**Container Strategy:**
- Game container: max-w-4xl mx-auto for primary gameplay area
- Question cards: max-w-2xl for optimal reading
- Responsive padding: px-4 md:px-6 lg:px-8

**Grid System:**
- Two-player score display: grid grid-cols-2 gap-4
- Answer choices: grid grid-cols-1 md:grid-cols-2 gap-3
- Room lobby: centered single column layout

## Component Library

### Game States & Screens

**1. Lobby/Entry State:**
- Centered card layout (max-w-md)
- Large title with icon (📚 or game icon from Heroicons)
- Input field for room code (h-12, rounded-lg, border-2)
- Two prominent CTAs side-by-side: "Create Room" | "Join Room"
- Subtle tagline beneath title: "Compete. Learn. Win."

**2. Waiting Room:**
- Room code display in large, copyable format (text-2xl, monospace font)
- Animated "Waiting for opponent..." indicator
- Share button with copy-to-clipboard functionality
- Cancel/Leave room option (text-sm, subdued)

**3. Active Game Screen:**
- Split into three zones:
  - **Top Bar:** Player scores side-by-side, round indicator (Question 1/10)
  - **Question Area:** Large card with question text, generous padding (p-8)
  - **Answer Grid:** 2x2 grid on desktop, stacked on mobile

**4. Results/Game Over:**
- Victory/defeat messaging with appropriate icon
- Final score comparison (side-by-side or versus layout)
- "Play Again" and "New Room" CTAs
- Optional: Answer review toggle

### Core UI Components

**Cards:**
- Border radius: rounded-xl (0.75rem)
- Shadow: shadow-lg for primary cards, shadow-md for nested
- Padding: p-6 md:p-8 for containers
- Border: Optional subtle border (border border-gray-200 equivalent)

**Buttons:**
- Primary CTA: h-12, px-6, rounded-lg, font-semibold
- Secondary: Similar size but outlined variant
- Disabled state: opacity-50, cursor-not-allowed
- Full-width on mobile, auto-width on desktop

**Answer Choices:**
- Card-style buttons with letter labels (A, B, C, D)
- Height: min-h-[4rem], responsive to content
- Active/Selected state: border-2 treatment
- Hover: Subtle scale transform (transform hover:scale-[1.02])
- Transition: transition-all duration-200

**Input Fields:**
- Height: h-12
- Padding: px-4
- Border: border-2, focus:border-[accent] with ring-4 ring-opacity-20
- Rounded: rounded-lg

**Status Indicators:**
- Real-time score: Large numbers (text-4xl) in designated score zones
- Timer/Progress: Progress bar or circular indicator
- Connection status: Small badge in corner

### Icons
**Library:** Heroicons via CDN (outline for UI, solid for states)
**Usage:**
- Trophy icon for scores/winners
- Clock for timers
- Check/X for correct/incorrect answers
- User icons for player indicators
- Copy icon for room code sharing

## Layout Patterns

**Responsive Breakpoints:**
- Mobile-first: Single column, stacked elements
- md (768px+): Side-by-side scores, 2-column answer grid
- lg (1024px+): Wider question cards, more generous spacing

**Vertical Rhythm:**
- Section spacing: space-y-6 for game states
- Component spacing: gap-4 between related elements
- Breathing room: Generous padding in active game (py-8)

**Animations:**
- Minimal, purposeful only
- Question transitions: Subtle fade-in (opacity + translate)
- Answer selection: Quick scale feedback
- Score updates: Number counter animation
- NO continuous/looping animations

## Interaction Patterns

**Answer Submission:**
- Single-click to select (immediate visual feedback)
- Locked state after submission (show "Waiting for opponent...")
- Clear indication of selected answer

**Real-time Updates:**
- Smooth transitions between questions (300ms)
- Live opponent status indicator
- Score updates with subtle pulse effect

**Error States:**
- Room not found: Inline error message below input
- Connection issues: Banner notification
- Empty input: Button disabled state

## Images
**No hero image required** - this is a game application focused on functionality

**Icon/Illustration Usage:**
- Game logo/icon in lobby (96x96px or SVG)
- Victory/defeat illustrations on results screen (optional, 200x200px)
- Empty state illustration for waiting room (optional)
- Keep visuals minimal to maintain focus on gameplay

## Mobile Considerations
- Touch-friendly tap targets (min-h-12 for all interactive elements)
- Adequate spacing between answer choices (gap-3 minimum)
- Full-width buttons on mobile
- Simplified score display on small screens
- Sticky header with scores during active game

## Accessibility
- ARIA labels for all game states
- Keyboard navigation for answer selection (1-4 keys)
- Focus indicators on all interactive elements
- Screen reader announcements for score changes
- High contrast between text and backgrounds