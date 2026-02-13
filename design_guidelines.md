# PolyHouse - Design Guidelines

## Design Approach
**Reference-Based Approach**: Terminal/HUD-style sports betting interface inspired by professional trading platforms and gaming interfaces. Think Bloomberg Terminal meets esports HUD - data-dense, efficient, futuristic.

## Core Design Principles
1. **Terminal Aesthetics**: High-contrast, information-dense "command center" feel
2. **Mobile-First**: Optimized for 430px viewport (mobile betting focus)
3. **Instant Feedback**: Every interaction provides visual confirmation
4. **Zero Friction**: Gasless betting requires zero cognitive load on UI

---

## Typography

**Font Stack:**
- **Primary**: Inter (400, 500, 700, 900) - UI text, headings
- **Monospace**: JetBrains Mono (400, 500, 700) - Numbers, balances, timestamps, data

**Hierarchy:**
- App Title: `text-lg font-black italic tracking-tighter` (POLYHOUSE logo)
- Section Headers: `text-xs font-bold tracking-wider uppercase text-zinc-400`
- Card Titles: `text-base font-black text-white`
- Body Text: `text-sm font-normal`
- Data/Numbers: `font-mono text-xs` (balances, odds, percentages)
- Micro Labels: `text-[9px] md:text-[10px] font-mono uppercase`

---

## Color System

**Base Theme:**
- Background: `#050505` (zinc-950)
- Surface: `#121214` (zinc-900)
- Elevated: `#1c1c1f` (zinc-850)
- Borders: `#27272a` (zinc-800)
- Subtle Borders: `rgba(39, 39, 42, 0.5)`

**Neon Accents (Context-Based):**
- Predict Tab: `#fb7185` (Rose/Pink) - wild-brand
- Success/Secondary: `#34d399` (Emerald/Green) - wild-scout
- Info/Tertiary: `#3b82f6` (Blue) - wild-trade
- Dashboard/Rank: `#fbbf24` (Amber/Gold) - wild-gold

**Semantic Colors:**
- Success: `#34d399` (wild-scout)
- Warning: `#fbbf24` (wild-gold)
- Error: `#fb7185` (wild-brand)
- Neutral: `#3f3f46` (zinc-700)

---

## Layout System

**Spacing Units (Tailwind):**
- Use: 1, 2, 3, 4, 6, 8, 12, 16, 20 (standard progression)
- Container padding: `p-3` (cards), `p-4` (header/panels)
- Section gaps: `space-y-3` (tight), `space-y-4` (standard)

**Grid Structure:**
- Max width: `max-w-[430px] mx-auto` (mobile container)
- Multi-column: `grid-cols-2` (player cards), `grid-cols-3` (odds buttons, tabs)
- Gap: `gap-1` (tabs), `gap-2` (grids), `gap-3` (cards)

**Viewport Layout:**
```
[Fixed Header - 56px (h-14)]
[Tab Switcher - auto height]
[Scrollable Content - flex-1]
[Fixed Bottom Nav - 64px (h-16)]
```

---

## Component Library

### Glass Panels
- Background: `bg-zinc-900/80 backdrop-blur-lg`
- Border: `border border-zinc-800/50`
- Used for: Header, modals, overlays

### Cards (Bet Markets, Players)
- Background: `bg-zinc-900`
- Border: `border border-zinc-800`
- Hover: `hover:border-zinc-600`
- Accent Strip: `h-0.5 w-full bg-[accent-color] absolute top-0`

### Buttons
**Primary CTA:**
- Default: `bg-[accent-color] text-zinc-950 font-black text-xs py-3`
- Hover: `hover:bg-[lighter-accent]`
- Examples: "PLACE BET", "FUND CURVE"

**Secondary/Tabs:**
- Active: `bg-zinc-800 text-white shadow`
- Inactive: `text-zinc-500 hover:text-zinc-300`

**Wallet Chip (Header):**
- `bg-zinc-900/50 border border-zinc-800 rounded-full px-3 py-1.5`
- Contains: Balance (mono) + Wallet icon

### Odds Display
- Grid layout: `grid grid-cols-3 gap-2`
- Each option: Vertical stack with large price + team/outcome
- Active selection: Border glow effect

### Progress Bars (Scout Funding)
- Container: `h-3 bg-zinc-950 rounded-full border border-zinc-800`
- Fill: `bg-[accent-color]` with glow `shadow-[0_0_15px_rgba(color,0.6)]`

### Loading States
- Skeleton: `bg-zinc-850 animate-pulse-skeleton`
- Grid of skeletons matching content structure

### Toasts
- Position: `fixed bottom-20 left-1/2 -translate-x-1/2`
- Style: `bg-zinc-850 border border-zinc-700 rounded-lg p-3 shadow-2xl`
- Auto-dismiss after 3s

### Badges
- Demo Mode: `bg-zinc-900/80 border border-wild-gold/30 text-wild-gold text-[8px] font-black px-2 py-1 rounded`
- Position: `absolute top-2 right-2`

---

## Navigation

### Bottom Tab Bar
- Fixed: `fixed bottom-0 w-full h-16`
- Layout: `grid grid-cols-4 gap-1`
- Background: `bg-zinc-900 border-t border-zinc-800`

**Tab Structure:**
```
Icon (w-5 h-5)
Label (text-[10px] font-mono uppercase)
Active: accent color + font-bold
Inactive: text-zinc-600
```

### Top Header
- Fixed: `fixed top-0 h-14 glass-panel`
- Left: Logo + Icon
- Right: Wallet chip (clickable)

---

## Animations

**Minimal Philosophy** - Only essential feedback:
- View transitions: `fadeIn 0.2s ease-out`
- Drawer slides: `slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)`
- Skeleton pulse: `pulseSkeleton 1.5s infinite`
- Toast appear/disappear: `opacity 0.3s`

**NO** complex hover animations, card flips, or distracting effects.

---

## Visual Effects

**HUD Grid Background:**
```
bg-zinc-950 
bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),...]
bg-[size:30px_30px]
```

**Glow Effects** (Sparingly):
- Active progress bars: `shadow-[0_0_15px_rgba(accent,0.6)]`
- Selected bets: Subtle neon border glow

**Text Selection:**
- `selection:bg-[accent] selection:text-black`

---

## Responsive Behavior

**Mobile-Only Focus:**
- All designs assume 375-430px width
- No desktop breakpoints needed
- Disable user scaling: `maximum-scale=1.0, user-scalable=no`

---

## Images

**Not Required** - This is a data-terminal interface. All visuals are typography, icons, and geometric elements.

**Player Avatars:**
- Placeholder circles with initials: `w-12 h-12 bg-zinc-800 rounded-full`
- Future: Optional profile images

**Icons:**
- Use Lucide React: `<Zap>`, `<Wallet>`, `<TrendingUp>`, `<Shield>`, etc.
- Size: `w-4 h-4` (inline), `w-5 h-5` (tabs), `w-12 h-12` (empty states)

---

## Key Interactions

1. **Bet Placement**: Click odds → Preview slip → Confirm → Toast feedback
2. **Wallet Access**: Header chip → Slide-up drawer (not modal)
3. **Tab Switching**: Instant with fade-in animation
4. **Sub-View Tabs**: Horizontal pill selector with smooth transitions
5. **Scout Funding**: Slider input → Live progress bar update → Mint button

---

## Accessibility Notes
- Maintain consistent `text-xs` minimum size
- High contrast ratios (neon on dark zinc)
- Touch targets: Minimum `h-10` for tap areas
- Keyboard navigation for tabs