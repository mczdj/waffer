// CSS-pixel viewport breakpoints, not device detection or browser zoom.
export function getWebLayout(width: number) {
  const mode = width < 600 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
  const desktop = mode === 'desktop';
  const phone = mode === 'phone';
  const pageWidth = Math.min(width, desktop ? 1440 : 1000);
  const padding = desktop ? 32 : phone ? 16 : 24;
  const gap = desktop ? 20 : phone ? 12 : 16;
  const dealColumns = desktop ? 3 : phone ? 1 : 2;
  return { mode, desktop, phone, pageWidth, padding, gap, dealColumns,
    mapHeight: desktop ? 460 : phone ? 330 : 400 };
}
export type WebLayout = ReturnType<typeof getWebLayout>;
