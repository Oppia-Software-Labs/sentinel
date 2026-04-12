# Style Guide — UGH Club Design System

> Reference image: `assets/hero-reference.png`  
> Claude must view this image before designing anything.

---

## Overall Aesthetic

**Mood:** Bold, editorial, cinematic. Irreverent tone with premium execution.  
**Feel:** Full-bleed immersive hero, anime/illustrated landscape backgrounds, stark white typography overlaid on rich scenery.  
**Inspiration:** Luxury brand meets internet culture — confident, slightly sarcastic, visually stunning.

---

## Background

**Hero background image path:** `public/hero/hero.svg`  
Claude must always use this file as the hero background image. Do NOT use gradients, solid colors, or placeholder backgrounds for the hero section. Always reference:

```css
background-image: url('/public/hero/hero.svg');
background-size: cover;
background-position: center;
```

Or as an `<img>` / CSS background on the hero wrapper. The image is an illustrated/anime-style mountain landscape with rich blues, greens, and whites.

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| Text on hero | `#FFFFFF` | All headlines and body on hero |
| Button bg | `#FFFFFF` | Primary CTA button |
| Button text | `#1a1a1a` | Dark text on white button |
| Input bg | `rgba(255,255,255,0.15)` | Frosted/semi-transparent input |
| Input border | `rgba(255,255,255,0.3)` | Subtle white border |
| Input text | `#FFFFFF` | White placeholder and input text |
| Nav text | `#FFFFFF` | Logo and menu items |
| Overlay | `none` | Do NOT add dark overlays on the hero — let the illustration breathe |

---

## Typography

| Element | Style |
|---|---|
| Logo / Wordmark | Small caps or light serif/sans, `#FFFFFF`, top-left |
| H1 Headline | Very large (clamp 48px–96px), **bold serif or heavy sans**, white, left-aligned |
| Brand accent in headline | Same size, slightly different weight or italic — e.g. *"Ugh."* at end of headline |
| Body / subheading | 14–16px, regular weight, white, max-width ~600px |
| Nav | Small, clean, white, top-right |

---

## Layout

- **Full-viewport hero** — 100vw × 100vh, no padding top
- **Nav:** Minimal, logo top-left, "Menu ≡" top-right
- **Content:** Bottom-left anchored — headline + subtext + CTA form in the lower ~40% of the hero
- **Email form:** Inline — input + button side by side, frosted input, white solid button
- **Sponsor logos:** Bottom-right, small, white, labeled "Sponsored By"
- **No cards, no sections visible above fold** — pure hero immersion

---

## Component Style

**Buttons:**
- Background: `#FFFFFF`
- Text: `#111111`, medium weight
- Padding: `14px 28px`
- Border-radius: `6–8px`
- No shadow, no border

**Input fields:**
- Background: `rgba(0,0,0,0.3)` or `rgba(255,255,255,0.12)`
- Border: `1px solid rgba(255,255,255,0.35)`
- Text + placeholder: `rgba(255,255,255,0.7)`
- Border-radius: `6–8px`
- Envelope icon inside, left-aligned

**Form row:** Input ~60% width, button ~35%, small gap.

---

## What Claude Must Always Do

1. **Read `assets/hero-reference.png`** before starting any design work.
2. **Use `public/hero/hero.svg`** as the hero background — never substitute it.
3. Keep white text on the illustrated background — no dark overlay that kills the illustration.
4. Match the bold, left-aligned, large-headline layout seen in the reference.
5. Keep the tone irreverent and confident in any copy written.

---

## Additional Visual References

Claude must view ALL of these images before designing any section:

| File | What it shows | Use for |
|---|---|---|
| `assets/hero-reference.png` | Full-bleed illustrated hero, white bold text, frosted input + white CTA | Hero sections |
| `assets/ref-liquid-glass-ui.png` | Frosted glass card over illustrated background, dark semi-transparent panel, tabs, toggles | Modals, cards, overlays on illustrated backgrounds |
| `assets/ref-about-section.png` | Two-column layout: text left, image+stat cards right. Light background, green accent badges, stat overlays | Problem / Solution / About sections |
| `assets/ref-cards-grid.png` | 3-column image cards with label + green icon button bottom-right, section label pill top-left | Features / Services grid sections |
| `assets/ref-staggered-cards.png` | Staggered/cascading card layout at different heights, rounded cards, soft gray background, nav arrows | Showcase / carousel sections |

### Key patterns extracted from new references

**Section label pills** (`ref-about-section.png`, `ref-cards-grid.png`):
- Small uppercase pill badge above section title
- Background: light green-yellow (`#ECFB72` or similar), text dark
- Border-radius: 9999px, padding: `px-3 py-1`, font-size: `text-xs`

**Stat overlay cards** (`ref-about-section.png`):
- Floating cards overlapping a main image
- Background: white or light gray, soft shadow
- Large bold number + small label text beside it
- Short description below

**Image cards with CTA icon** (`ref-cards-grid.png`):
- Rounded corners (`rounded-2xl`), full image fill
- Label text bottom-left in white, bold
- Small green pill button bottom-right with arrow icon
- Hover: slight scale

**Staggered layout** (`ref-staggered-cards.png`):
- Cards at varying vertical offsets to create depth
- Connected with subtle dashed lines
- Soft `#F0F2F5` background, no hard borders

**Liquid glass / frosted panels** (`ref-liquid-glass-ui.png`):
- `backdrop-filter: blur(16px)`
- Background: `rgba(30, 35, 40, 0.55)`
- Border: `1px solid rgba(255,255,255,0.12)`
- Text: white, muted white for secondary
- Use over illustrated/scenic backgrounds only

---

## Layout References — Solution & Features Sections

| File | What it shows | Use for |
|---|---|---|
| `assets/ref-split-feature.png` | Two-column: left = large UI mockup in gray container, right = icon list with one highlighted row. Clean white bg, minimal borders | Solution section layout |
| `assets/ref-stats-features.png` | Large bold numbers (10.6x, 37%) as hero stats, then 3-col icon+title+text below a thin divider. Pure white, heavy typography | Stats + Features layout |

### Patterns from new references

**Large stat numbers** (`ref-stats-features.png`):
- Font-size: 80–100px, font-weight: 800, color: #0a0a0a
- No background, no card — just raw typography on white
- Small label below in gray, font-size: 14px

**3-col feature list with dividers** (`ref-stats-features.png`):
- Thin `border-top` divider above each column
- Icon top (simple line icon, ~24px, dark)
- Bold title, then gray description text below
- No cards, no shadows — pure whitespace-driven layout

**Split layout with UI mockup** (`ref-split-feature.png`):
- Left: rounded gray container (~#F5F5F3) with a UI diagram/mockup inside
- Right: vertical list of features, each with icon + title + optional description
- One row highlighted with light gray pill background
- "Explore →" style link top-right of section
