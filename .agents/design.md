# Architecture & Design Specifications (design.md)
Project: Khalil & Sons - Luxury Jewellery Business Website

## Visual Theme & Design Standards
- Typography: Headline Font: Newsreader (Serif), Body Font: Work Sans (Sans-serif)
- Color Palette:
  - Primary Gold Gradient: #755a23 to #c1a162
  - Background: #f9f9f9
  - Text Primary: #2d3435
  - Text Secondary: #5a6061
  - Border: #e4e4e7
  - Error: #9f403d
- Aesthetic Guidelines:
  - Pure luxury aesthetic without generic AI SaaS elements.
  - No rounded muted background icon boxes (e.g., bg-muted/60 size-10 rounded-xl).
  - Authentic assay hallmark stamps (e.g. AU · 999.0, AU · 916.6).
  - Fine borders, clean typography, luxury spacing.

## Architecture
- Client-Server modular separation.
- Component-based structure with reusable small modules (< 500 lines per file).
- Server modules kept under 120 lines.
- Pure JavaScript (JSX) across the codebase (Zero TypeScript).
