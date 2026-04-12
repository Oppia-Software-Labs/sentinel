---
name: design-inspiration
description: >
  Use this skill EVERY TIME you create, modify, or review any visual design, UI component,
  web interface, artifact, frontend layout, or styled output. This skill loads visual
  reference files and design preferences so Claude produces designs aligned with the
  user's established look and feel. Trigger on: "create a design", "build a UI", "make
  a component", "style this", "design a page", "create an artifact", "build a dashboard",
  "make it look like", "update the design", "redesign", or any request involving HTML,
  CSS, React, SVG output, or visual creation. If the user has uploaded design references
  or style guides, this skill ensures Claude consults them before generating anything visual.
---

# Design Inspiration Skill

This skill ensures every design Claude produces is aligned with the user's visual references and established aesthetic preferences.

## Critical Files — Always Load These First

| File | Purpose |
|---|---|
| `assets/hero-reference.png` | **Primary visual reference** — view this image before ANY design work. It shows the exact look and feel to replicate. |
| `references/style-guide.md` | Design tokens extracted from the reference: colors, typography, layout, components |

**Hero background:** Always use `public/hero/hero.svg` as the background image for hero sections. Never use a placeholder, gradient, or solid color in its place.

---

## How It Works

When this skill triggers, Claude must:

1. **Load visual references** — Read all files in this skill's `references/` and `assets/` folders before writing a single line of design code.
2. **Extract design tokens** — Identify colors, typography, spacing, layout patterns, component styles, and mood/tone from the reference materials.
3. **Apply to output** — Use the extracted tokens and patterns as the primary design guide for the current task.
4. **Stay faithful** — Prioritize the reference aesthetic over generic or default styles. When in doubt, refer back to the references.

---

## Step-by-Step Process

### Step 1 — Load References

Before designing anything, read all files in this skill folder:

```
/mnt/skills/user/design-inspiration/references/   ← text/markdown style guides
/mnt/skills/user/design-inspiration/assets/        ← image references, screenshots, mockups
```

Use the `view` tool to list and read each file. For images, describe what you see in terms of:
- **Color palette** (dominant colors, accent colors, background tones)
- **Typography** (font weight, size hierarchy, line-height feel)
- **Spacing & layout** (tight vs airy, grid structure, padding)
- **Component style** (rounded vs sharp, flat vs elevated, minimal vs rich)
- **Mood & tone** (professional, playful, editorial, techy, warm, etc.)

### Step 2 — Build a Mental Style Map

Synthesize the references into a concise internal style map before coding:

| Token | Value observed in references |
|---|---|
| Primary color | e.g., deep navy #1A1F36 |
| Accent | e.g., electric indigo #6366F1 |
| Background | e.g., off-white #F9FAFB |
| Font feel | e.g., geometric sans, medium weight |
| Border radius | e.g., 8px, subtle rounding |
| Spacing | e.g., generous padding, 24px+ gutters |
| Elevation | e.g., soft shadows, layered cards |
| Tone | e.g., modern SaaS, clean editorial |

You don't need to show this table to the user — it's your internal guide.

### Step 3 — Design

Now create the design using the style map. Apply it consistently:
- CSS custom properties for colors and spacing
- Font stacks that match the reference aesthetic
- Component patterns mirroring the reference layouts
- Animations/transitions at the same energy level as references

### Step 4 — Sanity Check

Before delivering output, ask yourself:
> "Does this look like it belongs in the same design system as the references?"

If the answer is no, revise before delivering.

---

## When There Are No References Yet

If the `references/` and `assets/` folders are empty, tell the user:

> "I don't see any design references in your design-inspiration skill yet. To get started, you can add:
> - **Screenshots or images** of designs you like (drop into `assets/`)
> - **A style guide** describing your palette, fonts, and component preferences (add as `references/style-guide.md`)
> - **URLs** of sites whose aesthetic you want to match (add as `references/inspiration-links.md`)
>
> For now, I'll proceed with good design judgment — but once you add references, I'll match your exact look and feel."

Then proceed with the design task using high-quality defaults.

---

## Reference File Formats Supported

| File type | How Claude uses it |
|---|---|
| `.png` / `.jpg` / `.webp` | Visual inspection — extracts color, layout, component patterns |
| `.md` | Style guide text — reads directly for tokens and rules |
| `.html` / `.css` | Reference code — studies patterns and reuses tokens |
| `.json` | Design token files — reads and applies directly |
| `inspiration-links.md` | List of URLs — fetches and studies each page's design |

---

## Adding New References

Users can grow this skill over time by adding files to `assets/` or `references/`. Each new file becomes part of Claude's design vocabulary for all future designs in this project.

To add a file, the user can:
- Upload images directly in the Claude chat (Claude will note they should be saved to the skill folder)
- Paste a style guide as a new `.md` file in `references/`
- Drop a URL list in `references/inspiration-links.md`

---

## Key Principles

- **References > defaults.** Always prefer the established aesthetic over generic choices.
- **Consistency across sessions.** Every design in this project should feel like it belongs to the same visual family.
- **No generic AI aesthetics.** Avoid the default blue-gradient, card-heavy, rounded-button look unless the references support it.
- **Ask, don't assume.** If references are ambiguous on a key decision (e.g., dark mode vs light), ask the user rather than guessing.
