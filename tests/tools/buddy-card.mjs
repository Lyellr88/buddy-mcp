import { S, dynamicTools } from '../../dist/mcp/state.js';
import '../../dist/mcp/tools/core.js';

const makeTestBuddy = (overrides = {}) => ({
  name: 'TestBuddy',
  species: 'duck',
  rarity: 'rare',
  eye: '✦',
  hat: 'crown',
  shiny: false,
  peak: false,
  stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
  personality: 'A test duck.',
  salt: 'friend-2026-401',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const resetState = () => {
  S.currentBuddy = null;
};

const getHandler = (name) => dynamicTools.get(name)?.handler;

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                  GET_BUDDY_CARD TEST SUITE                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: No buddy returns simple message (no fancy formatting)
resetState();
const result1 = await getHandler('get_buddy_card')({});
if (result1.length < 100 || result1.includes('No buddy') || !result1.includes('╭')) {
  console.log('✅ Test 1: Returns simple message when no buddy');
  passed++;
} else {
  console.log('❌ Test 1: Unexpected formatted output');
  failed++;
}

// Test 2: Shows buddy name
resetState();
S.currentBuddy = makeTestBuddy();
const result2 = await getHandler('get_buddy_card')({});
if (result2.includes('TestBuddy')) {
  console.log('✅ Test 2: Shows buddy name');
  passed++;
} else {
  console.log('❌ Test 2: Missing buddy name');
  failed++;
}

// Test 3: Shows species (uppercase in card)
resetState();
S.currentBuddy = makeTestBuddy({ species: 'octopus' });
const result3 = await getHandler('get_buddy_card')({});
if (result3.includes('OCTOPUS') || result3.includes('octopus')) {
  console.log('✅ Test 3: Shows species');
  passed++;
} else {
  console.log('❌ Test 3: Missing species');
  failed++;
}

// Test 4: Shows rarity (uppercase in card)
resetState();
S.currentBuddy = makeTestBuddy({ rarity: 'legendary' });
const result4 = await getHandler('get_buddy_card')({});
if (result4.includes('LEGENDARY') || result4.includes('legendary')) {
  console.log('✅ Test 4: Shows rarity');
  passed++;
} else {
  console.log('❌ Test 4: Missing rarity');
  failed++;
}

// Test 5: Shows shiny marker
resetState();
S.currentBuddy = makeTestBuddy({ shiny: true });
const result5 = await getHandler('get_buddy_card')({});
if (result5.includes('✨')) {
  console.log('✅ Test 5: Shows shiny marker');
  passed++;
} else {
  console.log('❌ Test 5: Missing shiny marker');
  failed++;
}

// Test 6: Shows stats
resetState();
S.currentBuddy = makeTestBuddy();
const result6 = await getHandler('get_buddy_card')({});
if (result6.includes('DEBUGGING') || result6.includes('60')) {
  console.log('✅ Test 6: Shows stats');
  passed++;
} else {
  console.log('❌ Test 6: Missing stats');
  failed++;
}

// Test 7: Shows personality
resetState();
S.currentBuddy = makeTestBuddy({ personality: 'A quirky friend.' });
const result7 = await getHandler('get_buddy_card')({});
if (result7.includes('quirky')) {
  console.log('✅ Test 7: Shows personality');
  passed++;
} else {
  console.log('❌ Test 7: Missing personality');
  failed++;
}

// Test 8: Card updates when buddy changes
resetState();
S.currentBuddy = makeTestBuddy({ name: 'Buddy1' });
const card1 = await getHandler('get_buddy_card')({});
S.currentBuddy = makeTestBuddy({ name: 'Buddy2' });
const card2 = await getHandler('get_buddy_card')({});
if (card1.includes('Buddy1') && card2.includes('Buddy2') && !card2.includes('Buddy1')) {
  console.log('✅ Test 8: Card updates when buddy changes');
  passed++;
} else {
  console.log('❌ Test 8: Card not updated');
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
