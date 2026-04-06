import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import { join } from 'path';
import { homedir } from 'os';
import type { ProfileData } from '@/types.js';

// --- MCP-layer types ---

export type McpBuddy = ProfileData;

export interface GachaState {
  discoveredSpecies: string[];
  shinyCount: number;
  manifestedTools: ManifestedToolDefinition[];
  binaryMtime?: number;
  interactMode: boolean;
  /** Locked stat tool names for the current buddy — set at reroll, stable until next roll. */
  visibleStatTools: string[];
  /** Earned affection tokens — each token grants rare+ on next reroll */
  sessionAffectionTokens: number;
  /** Temporary accumulator (0-100) — resets each time a token is earned */
  sessionAffectionAccumulator: number;
}

export interface ManifestedToolDefinition {
  toolName: string;
  description: string;
  logic: string;
  scope: 'global' | 'local';
  inputSchema?: Record<string, unknown>;
}

export interface PendingPatch {
  salt: string;
  currentSalt: string;
  binaryPath: string;
  profile: ProfileData;
  rolledAt: string;
}

// --- Shared mutable state ---

export const S = {
  currentBuddy: null as McpBuddy | null,
  petBuddyStreak: 0, // Track consecutive pet_buddy calls for easter egg
  lastToolCalled: '', // Track which tool was last called to detect streak breaks
  relayModeActive: false, // True after first buddy display tool call this session
};

export const gachaState: GachaState = {
  discoveredSpecies: [],
  shinyCount: 0,
  manifestedTools: [],
  interactMode: true, // Always on by default; use deactivate_buddy_interact to turn off
  visibleStatTools: [],
  sessionAffectionTokens: 0,
  sessionAffectionAccumulator: 0,
};

export const dynamicTools: Map<
  string,
  {
    tool: Tool;
    handler: (args: Record<string, unknown>) => Promise<string>;
    _def: ManifestedToolDefinition;
  }
> = new Map();

export const GACHA_STATE_FILE = join(homedir(), '.buddy_mcp_gacha.json');
export const PENDING_PATCH_FILE = join(homedir(), '.buddy_mcp_pending.json');

export const server = new Server(
  { name: 'buddy-mcp', version: '2.0.0' },
  { capabilities: { tools: {} } },
);
