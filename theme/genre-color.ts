// Genre-id → swatch lookup. Pure helper backed by the token table; lookup at
// every render site keeps colours routed through `theme/tokens.ts`.

import { colors } from './tokens';

export function genreColor(id: number): string {
  return colors.genre[id] ?? colors.genreFallback;
}
