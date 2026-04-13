export const easeOutExpo = [0.22, 1, 0.36, 1] as const

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
}

export const fadeUpItem = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeOutExpo },
  },
}

export const fadeUpItemShort = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
}

/** Stagger children that use `slideFromTop` — top-to-bottom reveal on scroll. */
export const staggerFromTop = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.05,
    },
  },
}

/** Enter from above (negative Y) — “drops” into place when in view. */
export const slideFromTop = {
  hidden: { opacity: 0, y: -48 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: easeOutExpo },
  },
}

/** Default viewport for section reveals (re-animates when scrolling back). */
export const sectionRevealViewport = {
  once: false as const,
  amount: 0.12 as const,
  margin: '0px 0px -72px 0px' as const,
}
