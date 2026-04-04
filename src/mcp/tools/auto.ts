import type { ProfileData } from '@/types.js';

// --- Personality-based auto-tools ---
// All 5 names below are now baked-in CORE_TOOL_NAMES managed by stats.ts.
// AUTO_TOOL_NAMES is kept for reference and test assertions.

export const AUTO_TOOL_NAMES = new Set([
  'snark_roast',
  'chaos_audit',
  'zen_consult',
  'deep_trace',
  'patience_check',
]);

// Retained for call-site compatibility. All AUTO_TOOL_NAMES are CORE_TOOL_NAMES
// registered at startup via stats.ts — this function is now a no-op.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autoManifestTools(_buddy: ProfileData): void {}
