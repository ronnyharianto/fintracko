# Fintracko Design System

## Overview

Fintracko follows a **Modern Minimalist** design aesthetic focused on clarity, trust, and data-driven insights. The system uses a carefully curated color palette, semantic typography, and accessible components to create a professional yet approachable financial application.

## Color Palette

### Light Mode
- **Background**: `#ffffff` - Clean white for primary surfaces
- **Foreground**: `#0f172a` - Deep slate for text and foreground elements
- **Card**: `#f8fafc` - Subtle gray-blue for secondary surfaces
- **Primary Brand**: `#0f766e` - Teal (main action button, focus states)
- **Accent**: `#0d9488` - Lighter teal (interactive states, highlights)
- **Muted**: `#e2e8f0` - Light gray for borders and dividers
- **Borders**: `#e2e8f0` - Subtle borders for structure

### Dark Mode
- **Background**: `#0f172a` - Deep slate-blue background
- **Foreground**: `#f1f5f9` - Light slate for text
- **Card**: `#1e293b` - Slightly lighter background for cards
- **Primary Brand**: `#14b8a6` - Bright teal for contrast
- **Accent**: `#0d9488` - Muted teal for secondary actions
- **Muted**: `#334155` - Medium gray for subtle elements

### Why Teal?
- **Trust**: Evokes financial stability and security
- **Modern**: Contemporary and not corporate
- **Accessible**: Excellent contrast ratios in both light and dark modes
- **Versatile**: Works well with neutral grays and secondary colors

## Typography

### Font Families
- **Headings**: System fonts (Geist, Segoe UI, Roboto)
- **Body**: System fonts for optimal performance
- **Monospace**: System monospace for data tables and code (future)

### Sizing
- **H1**: 2rem (32px) - Page titles, hero sections
- **H2**: 1.875rem (30px) - Section headings
- **H3**: 1.25rem (20px) - Card titles
- **Body**: 1rem (16px) - Default text
- **Small**: 0.875rem (14px) - Labels, captions
- **Tiny**: 0.75rem (12px) - Timestamps, hints

### Line Height
- **Display**: 1.2 - Headings (tight for visual impact)
- **Body**: 1.5 to 1.6 - Content (readability)
- **Form Labels**: 1.4 - Labels and small text

## Spacing Scale

All spacing follows a consistent 4px scale:
- **2**: 0.5rem (2px)
- **3**: 0.75rem (3px)
- **4**: 1rem (4px)
- **6**: 1.5rem (6px)
- **8**: 2rem (8px)
- **12**: 3rem (12px)
- **16**: 4rem (16px)
- **20**: 5rem (20px)
- **24**: 6rem (24px)

## Component Sizes

### Buttons
- **Default**: h-10 (40px) - Standard interactive elements
- **Small**: h-9 (36px) - Compact actions, secondary buttons
- **Large**: h-11 (44px) - Primary CTAs, hero buttons
- **Icon**: w-10 h-10 (40px) - Icon-only buttons

### Input Fields
- **Height**: h-10 (40px) - Form inputs, consistent with buttons
- **Padding**: px-3 (12px) horizontal - Text breathing room
- **Border**: 1px solid - Subtle boundaries

### Border Radius
- **Small**: 0.25rem (4px) - Tight corners (inputs, small elements)
- **Default**: 0.5rem (8px) - Standard corners (buttons, cards)
- **Large**: 0.75rem (12px) - Relaxed corners (modals, containers)

## Shadows & Elevation

### Light Mode
- **Subtle**: `0 1px 2px rgba(0,0,0,0.05)` - Minimal lift
- **Standard**: `0 4px 6px rgba(0,0,0,0.1)` - Visible depth
- **Elevated**: `0 20px 25px rgba(0,0,0,0.15)` - Strong lift (modals)

### Dark Mode
- **Subtle**: `0 1px 2px rgba(255,255,255,0.05)` - Minimal lift
- **Standard**: `0 4px 6px rgba(255,255,255,0.1)` - Visible depth

## Interactive States

### Hover
- Buttons: `-10% opacity change` or `background-color shift`
- Links: `underline, color to primary`
- Cards: `bg-white dark:bg-slate-800 transition`

### Focus
- All interactive elements: `ring-2 ring-primary ring-offset-2`
- Ring color: Primary teal in light, bright teal in dark

### Active/Pressed
- Buttons: `translate-y-px` (slight downward movement)
- Opacity change for secondary buttons

### Disabled
- All disabled elements: `opacity-50 pointer-events-none`

## Layout Patterns

### Hero Section
- Max-width: 80rem (1280px)
- Padding: 8rem top, 10rem bottom (desktop) for breathable gradients
- Centered high-impact text with multi-stop brand gradient (`bg-clip-text text-transparent bg-gradient-to-r from-primary via-teal-500 to-emerald-500`)
- Floating background elements (animated pulse blobs in `emerald-400/20` and `teal-500/15` with `blur-3xl`)

### Feature Bento Grid
- **Desktop**: Multi-column Bento Grid (`grid-cols-1 md:grid-cols-3` with row spans)
  - Key sections: Multi-Workspace spans 2x2 with vertical layout
  - Bank-Grade Security: Full width with horizontal content split
- **Mobile**: Stacks into 1 column
- Cards: `bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/20 hover:from-primary/10 hover:to-emerald-500/10 hover:shadow-2xl hover:scale-[1.02] transition-all`

### How It Works Timeline
- **Desktop**: 3 horizontal items with a connecting gradient path line (`bg-gradient-to-r from-primary/40 via-emerald-500/40 to-primary/40`)
- **Mobile**: Vertically stacked items
- Accents: High-impact gradient numbered badges (`bg-gradient-to-br from-primary to-emerald-500 text-white`) and `bg-card` icon frames with subtle `ring-1 ring-primary/15`

### Navigation
- Sticky header with backdrop blur and glassmorphism gradient (`from-primary/5 via-accent/5 to-primary/5 backdrop-blur-md`)
- Theme switch toggle (Moon/Sun SVG, standard interactive role)
- Logo + branding on left
- Navigation links (hidden on mobile)
- Auth buttons on right

### Footer
- 4-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Subtle teal-tinted background with bottom-shading (`bg-gradient-to-b from-primary/5 to-muted/30`)
- High-contrast envelope and location pin SVG icon rows, properly aligned in the Contact section
- Small font size for legal text with a gradient center accent line

## Form Design

### Form Fields
- Label: `text-sm font-medium mb-2`
- Input: h-10 with px-3 padding
- Icon: `w-4 h-4` positioned absolutely left
- Error: `text-xs text-red-500 mt-1`

### Validation
- **Success**: Green checkmark on field
- **Error**: Red border + error message below
- **Focus**: Teal ring around field

### Button States
- **Default**: Primary teal background
- **Loading**: Spinner animation + disabled state
- **Success**: Checkmark icon
- **Error**: Red background with error message

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: 1024px+

### Mobile-First Approach
- Start with mobile layout
- Use `md:` and `lg:` prefixes for larger screens
- Hide elements with `hidden md:flex` or similar

### Navigation Breakpoints
- Navigation links hidden on mobile (`hidden md:flex`)
- Mobile menu toggle button (future implementation)
- Hero buttons stack vertically on mobile

## Accessibility Guidelines

### Semantic HTML
- Use `<main>`, `<header>`, `<footer>` tags
- Use `<button>` for all clickable elements
- Use `<form>` for form containers

### ARIA Labels
- All icons should have `aria-label` or context
- Form inputs should have associated `<label>`
- Buttons should have descriptive text

### Color Contrast
- All text: 4.5:1 minimum for AA compliance
- Links: Underlined or clearly distinguishable color
- Focus states: Visible 2px ring

### Keyboard Navigation
- Tab through all interactive elements
- Enter to activate buttons/forms
- Escape to close modals (future)

## Component Library

### Pre-built Components
- **Button** - Multiple variants (default, outline, ghost, destructive, link)
- **Input** - Text input with integrated icon support
- **Card** - Consistent padding and borders
- **Badge** - Status indicators (future)
- **Select** - Dropdown component (future)

## Design Tokens (CSS Variables)

All design tokens are defined in `globals.css` using CSS variables. In Tailwind v4, HSL-channel-based variables are mapped inside the `@theme inline` block wrapped in the standard `hsl()` function:
- `--primary`: Brand color (teal)
- `--accent`: Secondary action color (bright teal)
- `--background`: Primary surface
- `--foreground`: Primary text (resolves to bright slate in dark mode and dark navy in light mode)
- `--muted`: Subtle elements
- `--border`: Divider lines
- `--radius`: Border radius base unit

### Theme Management
Fintracko features a custom, high-performance **Default Dark** theme setup:
- Default dark theme via `.dark` utility on the standard HTML template (`suppressHydrationWarning`).
- Pre-hydration inline script running synchronously inside the `<head>` of `RootLayout` to check `localStorage.theme` and prevent FOUC (flash of unstyled content).
- An accessible `ThemeToggle` component with `role="switch"` and standard Sun/Moon SVG icons.
- Auto-themed scrollbars and form elements via `color-scheme` in CSS.

## Usage Guidelines

### When to Use Teal
- Primary buttons and CTAs
- Active states and highlights
- Focus rings and indicators

### When to Use Gray
- Borders and dividers
- Secondary text (muted-foreground)
- Disabled states

### When to Use White
- Primary surfaces and cards
- Form inputs and text areas

### Spacing
- Use Tailwind spacing scale: `p-4`, `m-6`, `gap-8`
- Never use arbitrary values unless justified
- Maintain 4px grid consistency

## Future Enhancements

1. **Dark Mode Refinement** - Further polish dark mode colors
2. **Component Variants** - Add size and style variants
3. **Animation Library** - Consistent transitions and animations
4. **Iconography** - Lucide React icon guidelines
5. **Data Visualization** - Chart color palette
6. **Mobile Navigation** - Responsive sidebar/drawer

## References

- Tailwind CSS: https://tailwindcss.com
- Lucide React Icons: https://lucide.dev
- shadcn/ui: https://ui.shadcn.com
- Web Accessibility Guidelines: https://www.w3.org/WAI/