# Design Brief

## Direction

Warm Academic Clarity — a calm, trustworthy study companion for Indonesian school assessment and practice.

## Tone

Refined, restrained productivity: quiet confidence and generous whitespace, never busy or playful-gimmicky.

## Differentiation

A deep forest-teal identity with warm amber accents and a subtle answer-sheet grid texture — an assessment platform that feels scholarly, not corporate-edtech.

## Color Palette

| Token      | OKLCH         | Role                                    |
| ---------- | ------------- | --------------------------------------- |
| background | 0.985 0.006 150 | Warm off-white page canvas              |
| foreground | 0.22 0.02 160   | Primary text, deep green-charcoal       |
| card       | 1.0 0.002 150   | Elevated surfaces, tables, forms        |
| primary    | 0.42 0.09 168   | Deep forest-teal — CTAs, active nav     |
| accent     | 0.72 0.15 72    | Warm amber — highlights, progress, wins |
| muted      | 0.955 0.012 155 | Section fills, secondary chips          |

## Typography

- Display: Plus Jakarta Sans — headings, dashboard titles, hero, wordmark
- Body: Figtree — paragraphs, labels, tables, exam questions (high legibility)
- Mono: JetBrains Mono — participant IDs, scores, numeric data
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Flat warm canvas with white cards lifted by soft, low-contrast shadows; hierarchy comes from surface contrast and borders, not heavy blur.

## Structural Zones

| Zone    | Background          | Border     | Notes                                          |
| ------- | ------------------- | ---------- | ---------------------------------------------- |
| Header  | `bg-card`           | `border-b` | Sticky; wordmark left, user/profile right      |
| Sidebar | `bg-sidebar`        | —          | Deep forest-teal; active item amber-tinted     |
| Content | `bg-background`     | —          | Alternate `bg-muted/40` for stat/section bands |
| Footer  | `bg-muted/40`       | `border-t` | Quiet, small text, NURISH SMART identity       |

## Spacing & Rhythm

Spacious and tidy: section gaps `py-8 md:py-12`, card padding `p-5 md:p-6`, grid gaps `gap-4 md:gap-6`, micro-spacing `gap-2` for label/value pairs.

## Component Patterns

- Buttons: rounded-xl, solid forest-teal primary, amber reserved for highlights; hover lifts shadow + slight brightness, `transition-smooth`
- Cards: rounded-2xl, `bg-card`, `border border-border`, `shadow-subtle`; stat cards use a small colored icon chip
- Badges: pill-shaped, semantic — success green (Aktif), amber (Menunggu Pemeriksaan), muted grey (Draft), teal (Selesai)
- Question navigator: square rounded numbered tiles, teal=answered, amber-ring=current, muted=unanswered

## Motion

- Entrance: single fade-and-rise (`animate-rise`, 0.4s ease-out) on page content groups
- Hover: `transition-smooth` on cards, buttons, nav items — subtle shadow/translate only
- Decorative: one gentle progress shimmer; no bouncy or looping distractions

## Constraints

- Keep it uncluttered; no decorative sections that carry no information
- All colors via semantic tokens; never raw hex or arbitrary Tailwind colors
- Mobile-first responsive: sidebar collapses to drawer; tables scroll or stack
- Exam page prioritizes large tap targets, legible question text, and clear answered/unanswered state

## Signature Detail

The numbered question-navigator grid — a quiet homage to the answer sheet — becomes the platform's recognizable motif across exams and results.
