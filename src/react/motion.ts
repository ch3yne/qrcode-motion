/**
 * Detects whether the system prefers reduced motion.
 *
 * Kept as a standalone pure function instead of reading window inside the component: the check only
 * depends on the matchMedia passed in, so unit tests feed a fake and skip a DOM stack such as
 * jsdom.
 */
export function prefersReducedMotion(
  matchMedia: ((query: string) => { matches: boolean }) | undefined,
): boolean {
  if (!matchMedia) return false;
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
