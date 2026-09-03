---
name: responsive-design
description: Maintain and implement the responsive design architecture for AiDocs. Use this skill when building or refactoring components to ensure cross-device compatibility, consistent glassmorphism effects, and adherence to the three-tier styling system.
---

# Responsive Design Implementation Guide

This skill ensures AiDocs remains a high-performance, visually stunning platform across all screen sizes. It maps the integration of Tailwind CSS v4, custom glassmorphism styles, and adaptive component patterns.

## 1. Styling Architecture (Three-Tier System)

All components must adhere to this hierarchy to maintain the "Liquid Glass" aesthetic while ensuring performance:

1.  **Tailwind CSS v4 (Base Utilities)**: Used for layout, spacing, and responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
2.  **Custom CSS (Glass Effects)**: Global classes defined in `glass.css` (`.liquid-glass`, `.liquid-glass-strong`) for consistent backdrop filters and borders.
3.  **Theme Variables**: Standardized colors and typography tokens defined in `index.css`.

## 2. Core Layout Patterns

### Home Page Transformation
- **Hero Section**: `flex flex-col lg:flex-row`
  - Mobile: Vertical stack, content centered.
  - Desktop: Side-by-side (LeftPanel/RightPanel).
- **Testimonials**: Conditional rendering strategy.
  - Mobile: Flat marquee (2 columns), no 3D tilt (saves mobile GPU).
  - Desktop: 3D tilt marquee (3 columns) with interactive hover reveal for CTA.

### Dashboard Adaptation
- **Project Grid**: 
  - Mobile: `grid-cols-1` (single column list).
  - Desktop: `grid-cols-2` or `grid-cols-3` depending on screen width.
- **Glass Cards**: Fixed height/aspect ratio for consistency.

## 3. Responsive Component Patterns

### Mobile Navigation (AppNavbar)
- **Strategy**: Logo left, hamburger right.
- **Overlay**: Full-screen `liquid-glass-strong` menu with `AnimatePresence`.
- **Interactions**: Closes automatically on route change.

### Wizard & Modals
- **Paddings**: `p-6` (mobile) to `p-10` (desktop).
- **Widths**: `w-full` (mobile) to `max-w-2xl` (desktop).
- **Progress Trackers**: Scale dots or simplify for small screens.

### Workspace (Kanban)
- **Scroll Strategy**: `overflow-x-auto` on the board container.
- **Column Width**: Min-width fixed (e.g., `w-80`) to ensure items don't squash.

## 4. Best Practices for New Features

- **Mobile-First**: Always define the mobile layout first, then add `md:` and `lg:` overrides.
- **GPU Optimization**: Avoid heavy `backdrop-filter` or 3D transforms on mobile screens.
- **Touch Targets**: Ensure interactive elements (buttons, links) have a minimum size of `44x44px` for touch accuracy.
- **Typography Scaling**: Use fluid font sizes or responsive utility classes (`text-sm` -> `md:text-base`).

---
*Reference: [Responsive Map v1.0] verified via implementation review.*
