# Technical Requirements Document (TRD)
Project: Khalil & Sons - Luxury Jewellery Business Website

## Technical Stack
- Frontend: React 19, Vite 8, Tailwind CSS 4, shadcn/ui.
- Routing: React Router v7.
- State Management: React Context (AppContext, LoadingContext).
- Animation: GSAP, Motion.
- Icons: Lucide React / FontAwesome (no generic AI icons).
- Form Handling & Validation: React Hook Form, Zod.
- Language: JavaScript (ESModules / JSX strictly, zero TypeScript).

## Code Quality & Engineering Constraints
- Maximum file sizes: Frontend files < 500 lines, Backend files < 120 lines.
- Complete absence of inline code comments.
- Custom luxury modal dialogs instead of browser alert() or confirm().
- Centralized design tokens and consistent theme usage.
