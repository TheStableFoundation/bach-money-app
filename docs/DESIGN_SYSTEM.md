# Bach Money dApp Design System

This document outlines the design system used in the Bach Money dApp, ensuring consistency across all pages and components.

## 🎨 Design Principles

1. **Minimalist & Clean** - Simple, focused interfaces with clear hierarchy
2. **Dark Mode First** - Support for both light and dark color schemes
3. **Consistent Spacing** - Using Tailwind's spacing scale
4. **Typography Hierarchy** - Clear distinction between headings and body text
5. **Subtle Interactions** - Hover states and transitions for better UX

## 🎭 Color System

### CSS Variables

The design system uses CSS custom properties for theming:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

### Color Usage

| Purpose | Light Mode | Dark Mode | Usage |
|---------|-----------|-----------|-------|
| Background | `#ffffff` | `#0a0a0a` | Page backgrounds |
| Foreground | `#171717` | `#ededed` | Text color |
| Border | `black/[.08]` | `white/[.145]` | Borders, dividers |
| Hover Background | `#f2f2f2` | `#1a1a1a` | Interactive elements |
| Button Background | `#383838` | `#ccc` | Button hover states |

### Semantic Colors

- **Primary Action**: Uses `--foreground` color (inverted background/foreground)
- **Secondary Action**: Border with transparent background
- **Error State**: `text-red-600` (light) / `text-red-400` (dark)
- **Success State**: Use foreground color with success context

## 📝 Typography

### Font Families

```css
--font-sans: var(--font-geist-sans);  /* Primary font */
--font-mono: var(--font-geist-mono);  /* Code, labels, small text */
```

### Font Usage

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Main Heading (h1) | Geist Sans | `text-4xl` / `sm:text-5xl` | `font-bold` |
| Sub Heading (h2) | Geist Sans | `text-3xl` / `sm:text-4xl` | `font-bold` |
| Card Title (h3) | Geist Sans | `text-sm` | `font-semibold` |
| Body Text | Geist Sans | `text-sm` / `sm:text-base` | `font-normal` |
| Labels | Geist Mono | `text-xs` / `text-sm` | `font-medium` |
| Code/Technical | Geist Mono | `text-xs` / `text-sm` | `font-normal` |

### Typography Classes

```tsx
// Main heading
className="text-4xl sm:text-5xl font-bold"

// Paragraph text
className="text-sm sm:text-base opacity-80"

// Label text
className="text-sm font-medium font-[family-name:var(--font-geist-mono)]"

// Helper text
className="text-xs opacity-60 font-[family-name:var(--font-geist-mono)]"
```

## 🔲 Components

### Buttons

#### Primary Button
```tsx
<button className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-semibold text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5">
  Secondary Action
</button>
```

### Input Fields

```tsx
<input
  type="text"
  className="w-full px-4 py-3 bg-[var(--background)] border border-black/[.08] dark:border-white/[.145] rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors placeholder:opacity-50"
  placeholder="Enter value..."
/>
```

### Select Dropdowns

```tsx
<select className="w-full px-4 py-3 bg-[var(--background)] border border-black/[.08] dark:border-white/[.145] rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors">
  <option value="">Select option</option>
</select>
```

### Cards

```tsx
<div className="flex flex-col gap-4 border border-black/[.08] dark:border-white/[.145] p-6 rounded-lg hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition-colors">
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center w-10 h-10 border border-black/[.08] dark:border-white/[.145] rounded-lg">
      {/* Icon */}
    </div>
    <h3 className="font-semibold text-sm">Card Title</h3>
  </div>
  <p className="text-xs opacity-70 font-[family-name:var(--font-geist-mono)]">
    Card description text
  </p>
</div>
```

### Links

```tsx
// Standard link
<a className="hover:underline hover:underline-offset-4">
  Link Text
</a>

// Link with icon
<a className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm">
  <Image src="/icon.svg" alt="" width={16} height={16} />
  Link Text
</a>
```

## 📐 Layout Structure

### Page Layout

```tsx
<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
  <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-4xl">
    {/* Content */}
  </main>
  
  <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
    {/* Footer links */}
  </footer>
</div>
```

### Content Sections

- **Max Width**: `max-w-4xl` for main content
- **Vertical Spacing**: `gap-8` between major sections
- **Horizontal Padding**: `p-8` (mobile) / `p-20` (desktop)
- **Section Gaps**: `gap-6` for related items

## 🎯 Spacing Scale

| Size | Tailwind | Pixels | Usage |
|------|----------|--------|-------|
| xs | `gap-2` | 8px | Inline elements |
| sm | `gap-3` | 12px | Tight grouping |
| md | `gap-4` | 16px | Related items |
| lg | `gap-6` | 24px | Section spacing |
| xl | `gap-8` | 32px | Major sections |
| 2xl | `gap-16` | 64px | Page sections |

## 🔄 Responsive Design

### Breakpoints

```css
/* Mobile first */
default: < 640px
sm: ≥ 640px
md: ≥ 768px
lg: ≥ 1024px
xl: ≥ 1280px
```

### Responsive Patterns

```tsx
// Text size
className="text-sm sm:text-base"

// Heading size
className="text-4xl sm:text-5xl"

// Layout direction
className="flex-col sm:flex-row"

// Grid columns
className="grid sm:grid-cols-2 md:grid-cols-3"

// Button width
className="w-full sm:w-auto"
```

## ✨ Interactive States

### Hover Effects

```tsx
// Button hover
hover:bg-[#383838] dark:hover:bg-[#ccc]

// Card hover
hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]

// Link hover
hover:underline hover:underline-offset-4

// Opacity hover
hover:opacity-80
```

### Focus States

```tsx
// Input focus
focus:outline-none focus:ring-2 focus:ring-foreground/20

// Link focus (browser default)
```

### Disabled States

```tsx
// Button disabled
disabled:opacity-50 disabled:cursor-not-allowed
```

### Transitions

```tsx
// All transitions
transition-colors   // For color changes
transition-opacity  // For opacity changes
transition-all      // For multiple properties

// Duration (default is fine, no need to specify)
```

## 🎨 Border Styles

### Border Widths
- Default: `border` (1px)
- None: `border-0`

### Border Colors
- Light mode: `border-black/[.08]`
- Dark mode: `dark:border-white/[.145]`
- Transparent: `border-transparent`

### Border Radius
- Small: `rounded-lg` (0.5rem)
- Medium: `rounded-xl` (0.75rem)
- Large: `rounded-2xl` (1rem)
- Full: `rounded-full` (9999px)

## 🖼️ Icons

### Icon Sizing
- Small: `w-4 h-4` or `width={16} height={16}` (16px)
- Medium: `w-5 h-5` (20px)
- Large: `w-6 h-6` (24px)
- Icon Container: `w-10 h-10` (40px)

### Icon Usage
```tsx
// SVG Icon
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="..." />
</svg>

// Image Icon
<Image src="/icon.svg" alt="" width={16} height={16} />
```

## 📱 Mobile Optimization

### Touch Targets
- Minimum height: `h-10` (40px)
- Minimum width: `w-10` (40px)
- Recommended: `h-12` (48px) for buttons

### Mobile Spacing
- Padding: `p-8` on mobile, `sm:p-20` on desktop
- Button width: `w-full` on mobile, `sm:w-auto` on desktop

## 🌓 Dark Mode Strategy

### Implementation
Uses native CSS `prefers-color-scheme` media query:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

### Tailwind Dark Mode Classes
```tsx
// Background
className="bg-[var(--background)]"

// Text
className="text-[var(--foreground)]"

// Border
className="border-black/[.08] dark:border-white/[.145]"

// Hover background
className="hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
```

## 🎯 Best Practices

1. **Always use CSS variables** for background and foreground colors
2. **Include dark mode classes** for borders and hover states
3. **Use semantic HTML** (main, footer, section, etc.)
4. **Maintain spacing consistency** with the spacing scale
5. **Test both color schemes** - light and dark mode
6. **Keep touch targets** at least 40px for mobile
7. **Use Geist Mono** for technical text, labels, and code
8. **Use opacity** for secondary text (`opacity-60`, `opacity-70`, `opacity-80`)
9. **Add transitions** for interactive elements
10. **Follow mobile-first** responsive design

## 📋 Component Checklist

When creating a new component:

- [ ] Uses CSS variables for colors
- [ ] Has dark mode support
- [ ] Has hover states
- [ ] Has focus states (if interactive)
- [ ] Has disabled states (if applicable)
- [ ] Uses correct font family
- [ ] Has proper spacing
- [ ] Is responsive (mobile-first)
- [ ] Has touch-friendly sizes (≥40px)
- [ ] Has smooth transitions

## 🔗 Related Documentation

- [Developer Guide](DEVELOPER_GUIDE.md)
- [Project Structure](PROJECT_STRUCTURE.md)
- [Quick Start Guide](QUICK_START.md)

---

**Last Updated**: January 2025  
**Maintained By**: Bach Money Development Team