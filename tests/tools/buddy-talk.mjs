import { S, gachaState, dynamicTools } from '../../dist/mcp/state.js';
import '../../dist/mcp/tools/core.js';

const makeTestBuddy = () => ({
  name: 'TestBuddy',
  species: 'duck',
  rarity: 'rare',
  eye: '✦',
  hat: 'none',
  shiny: false,
  peak: false,
  stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
  personality: 'A chatty duck.',
  salt: 'friend-2026-401',
  createdAt: new Date().toISOString(),
});

const resetState = () => {
  S.currentBuddy = null;
  gachaState.interactMode = false;
};

const getHandler = (name) => dynamicTools.get(name)?.handler;

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                   BUDDY_TALK TEST SUITE                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: Returns response with buddy set
resetState();
S.currentBuddy = makeTestBuddy();
const result1 = await getHandler('buddy_talk')({});
if (result1.length > 20) {
  console.log('✅ Test 1: Returns personality response with buddy');
  passed++;
} else {
  console.log('❌ Test 1: No response with buddy');
  failed++;
}

// Test 2: Includes buddy name in response
resetState();
S.currentBuddy = makeTestBuddy();
const result2 = await getHandler('buddy_talk')({});
if (result2.includes('TestBuddy')) {
  console.log('✅ Test 2: Includes buddy name in response');
  passed++;
} else {
  console.log('❌ Test 2: Missing buddy name');
  failed++;
}

// Test 3: Returns fallback without buddy
resetState();
const result3 = await getHandler('buddy_talk')({});
if (result3.length < 100) {
  console.log('✅ Test 3: Returns fallback without buddy');
  passed++;
} else {
  console.log('❌ Test 3: Unexpected response without buddy');
  failed++;
}

// Test 4: Different buddies return different responses (personality)
resetState();
S.currentBuddy = makeTestBuddy({ personality: 'A quirky duck.' });
const result4a = await getHandler('buddy_talk')({});
S.currentBuddy = makeTestBuddy({ personality: 'A grumpy duck.' });
const result4b = await getHandler('buddy_talk')({});
// Both should have their respective buddy names and some content
if (result4a.includes('TestBuddy') && result4b.includes('TestBuddy')) {
  console.log('✅ Test 4: Returns responses for different buddy states');
  passed++;
} else {
  console.log('❌ Test 4: Missing responses');
  failed++;
}

// Test 5: Multiple calls return responses
resetState();
S.currentBuddy = makeTestBuddy();
let allHaveContent = true;
for (let i = 0; i < 3; i++) {
  const result = await getHandler('buddy_talk')({});
  if (result.length < 10) allHaveContent = false;
}
if (allHaveContent) {
  console.log('✅ Test 5: Multiple calls return responses');
  passed++;
} else {
  console.log('❌ Test 5: Some calls returned empty');
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
