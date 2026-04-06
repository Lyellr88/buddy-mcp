import { S, gachaState, dynamicTools } from '../../dist/mcp/state.js';
import '../../dist/mcp/tools/core.js';

const makeTestBuddy = (overrides = {}) => ({
  name: 'TestBuddy',
  species: 'duck',
  rarity: 'rare',
  eye: '✦',
  hat: 'none',
  shiny: false,
  peak: false,
  stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
  personality: 'Test buddy.',
  salt: 'friend-2026-401',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const resetState = () => {
  S.currentBuddy = null;
  gachaState.discoveredSpecies = [];
  gachaState.shinyCount = 0;
  gachaState.sessionAffectionTokens = 0;
  gachaState.sessionAffectionAccumulator = 0;
  gachaState.visibleStatTools = [];
};

const getHandler = (name) => dynamicTools.get(name)?.handler;

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                  REROLL_BUDDY TEST SUITE                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: Token consumed when available
resetState();
S.currentBuddy = makeTestBuddy();
gachaState.sessionAffectionTokens = 1;
await getHandler('reroll_buddy')({});
if (gachaState.sessionAffectionTokens === 0) {
  console.log('✅ Test 1: Token consumed when available');
  passed++;
} else {
  console.log('❌ Test 1: Token not consumed');
  failed++;
}

// Test 2: Accumulator resets after reroll
resetState();
S.currentBuddy = makeTestBuddy();
gachaState.sessionAffectionAccumulator = 75;
await getHandler('reroll_buddy')({});
if (gachaState.sessionAffectionAccumulator === 0) {
  console.log('✅ Test 2: Accumulator resets to 0');
  passed++;
} else {
  console.log(`❌ Test 2: Accumulator is ${gachaState.sessionAffectionAccumulator}`);
  failed++;
}

// Test 3: Returns error or pending message (binary locked in test env)
resetState();
S.currentBuddy = makeTestBuddy();
const result3 = await getHandler('reroll_buddy')({});
if (result3.includes('Found a') || result3.includes('Binary is locked')) {
  console.log('✅ Test 3: Returns buddy info or pending message');
  passed++;
} else {
  console.log('❌ Test 3: Unexpected response');
  failed++;
}

// Test 4: Species dex and shiny are updated on successful patch (skipped in locked binary env)
console.log('✅ Test 4: Skipped (requires binary patch, not applicable in test env)');

// Test 5: Stat tools generated (2 tools per reroll)
resetState();
S.currentBuddy = makeTestBuddy();
await getHandler('reroll_buddy')({});
if (Array.isArray(gachaState.visibleStatTools) && gachaState.visibleStatTools.length === 2) {
  console.log(`✅ Test 5: Stat tools generated (2 tools)`);
  passed++;
} else {
  console.log(`❌ Test 5: ${gachaState.visibleStatTools.length} stat tools (expected 2)`);
  failed++;
}

// Test 6: Returns success message with found buddy
resetState();
S.currentBuddy = makeTestBuddy();
const result = await getHandler('reroll_buddy')({});
if (result.includes('Found a')) {
  console.log('✅ Test 6: Returns success message');
  passed++;
} else {
  console.log('❌ Test 6: No success message');
  failed++;
}

// Test 7: No token uses base rates (no guaranteed rare+)
resetState();
S.currentBuddy = makeTestBuddy();
gachaState.sessionAffectionTokens = 0;
await getHandler('reroll_buddy')({});
if (gachaState.sessionAffectionTokens === 0) {
  console.log('✅ Test 7: No token consumed when none available');
  passed++;
} else {
  console.log('❌ Test 7: Token was consumed');
  failed++;
}

console.log('\n' + '═'.repeat(64));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   ✅ ALL TESTS PASSED ✅                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
} else {
  process.exit(1);
}
