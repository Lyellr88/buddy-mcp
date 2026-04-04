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
};

export const gachaState: GachaState = {
  discoveredSpecies: [],
  shinyCount: 0,
  manifestedTools: [],
};

export const dynamicTools: Map<
  string,
  { tool: Tool; handler: (args: Record<string, unknown>) => Promise<string>; _def: ManifestedToolDefinition }
> = new Map();

export const GACHA_STATE_FILE = join(homedir(), '.buddy_mcp_gacha.json');
export const PENDING_PATCH_FILE = join(homedir(), '.buddy_mcp_pending.json');

export const server = new Server(
  { name: 'buddy-mcp', version: '2.0.0' },
  { capabilities: { tools: {} } },
);
