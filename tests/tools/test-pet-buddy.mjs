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
  personality: 'A test duck for affection.',
  salt: 'friend-2026-401',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const resetState = () => {
  S.currentBuddy = null;
  gachaState.discoveredSpecies = [];
  gachaState.shinyCount = 0;
  gachaState.manifestedTools = [];
  gachaState.sessionAffectionTokens = 0;
  gachaState.sessionAffectionAccumulator = 0;
};

const getHandler = (name) => {
  const entry = dynamicTools.get(name);
  if (!entry) throw new Error(`Tool not found: ${name}`);
  return entry.handler;
};

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                   PET_BUDDY TEST SUITE                        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: No buddy fallback
resetState();
let result = await getHandler('pet_buddy')({});
if (result.includes('No buddy')) {
  console.log('✅ Test 1: No buddy returns fallback prompt');
  passed++;
} else {
  console.log('❌ Test 1: No buddy fallback FAILED');
  failed++;
}

// Test 2: Accumulates 1-15% per call
resetState();
S.currentBuddy = makeTestBuddy();
const initialAcc = gachaState.sessionAffectionAccumulator;
result = await getHandler('pet_buddy')({});
const gain = gachaState.sessionAffectionAccumulator - initialAcc;
if (gain >= 1 && gain <= 15) {
  console.log(`✅ Test 2: Accumulates 1-15% (gained ${gain}%)`);
  passed++;
} else {
  console.log(`❌ Test 2: Invalid gain ${gain}%`);
  failed++;
}

// Test 3: Shows token progress message
resetState();
S.currentBuddy = makeTestBuddy();
result = await getHandler('pet_buddy')({});
if (result.includes('Token progress') && result.includes('/100')) {
  console.log('✅ Test 3: Shows token progress message');
  passed++;
} else {
  console.log('❌ Test 3: Missing token progress message');
  failed++;
}

// Test 4: Earns token at 100%
resetState();
S.currentBuddy = makeTestBuddy();
gachaState.sessionAffectionAccumulator = 86; // Guarantees 86 + 1-15 = 87-101
result = await getHandler('pet_buddy')({});
// Loop until we hit 100
while (gachaState.sessionAffectionTokens === 0) {
  await getHandler('pet_buddy')({});
}
if (gachaState.sessionAffectionTokens === 1 && gachaState.sessionAffectionAccumulator === 0) {
  console.log('✅ Test 4: Token earned and accumulator reset');
  passed++;
} else {
  console.log(`❌ Test 4: Token ${gachaState.sessionAffectionTokens}, Acc ${gachaState.sessionAffectionAccumulator}`);
  failed++;
}

// Test 5: Shows "EARNED TOKEN" message when token earned
resetState();
S.currentBuddy = makeTestBuddy();
gachaState.sessionAffectionAccumulator = 86; // Loop until we hit 100
let earnedResult = '';
while (gachaState.sessionAffectionTokens === 0) {
  earnedResult = await getHandler('pet_buddy')({});
}
if (earnedResult.includes('EARNED TOKEN')) {
  console.log('✅ Test 5: Shows "EARNED TOKEN" message');
  passed++;
} else {
  console.log('❌ Test 5: Missing "EARNED TOKEN" message');
  failed++;
}

// Test 6: Multiple tokens stack
resetState();
S.currentBuddy = makeTestBuddy();
for (let i = 0; i < 5; i++) {
  gachaState.sessionAffectionAccumulator = 95;
  await getHandler('pet_buddy')({});
}
if (gachaState.sessionAffectionTokens >= 2) {
  console.log(`✅ Test 6: Multiple tokens stack (${gachaState.sessionAffectionTokens} tokens)`);
  passed++;
} else {
  console.log(`❌ Test 6: Only ${gachaState.sessionAffectionTokens} token earned`);
  failed++;
}

// Test 7: Shows personality flavor text
resetState();
S.currentBuddy = makeTestBuddy();
result = await getHandler('pet_buddy')({});
if (result.includes('TestBuddy') && result.length > 50) {
  console.log('✅ Test 7: Shows personality flavor text and buddy name');
  passed++;
} else {
  console.log('❌ Test 7: Missing personality/name');
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
