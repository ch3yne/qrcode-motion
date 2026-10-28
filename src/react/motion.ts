/**
 * 判定系统是否偏好减弱动态效果。
 *
 * 做成独立纯函数而不是在组件里内联读 window：判定只依赖传入的 matchMedia，
 * 单测可以直接喂假函数，不必为了一个布尔判定引入 jsdom 之类的 DOM 测试栈。
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
