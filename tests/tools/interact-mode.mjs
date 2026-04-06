import { S, gachaState, dynamicTools } from '../../dist/mcp/state.js';
import '../../dist/mcp/tools/core.js';
import '../../dist/mcp/tools/interact.js';

const makeTestBuddy = () => ({
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
});

const resetState = () => {
  S.currentBuddy = makeTestBuddy();
  gachaState.interactMode = false;
};

const getHandler = (name) => {
  const entry = dynamicTools.get(name);
  if (!entry) throw new Error(`Tool ${name} not found`);
  return entry.handler;
};

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              ACTIVATE/DEACTIVATE INTERACT TESTS               ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: Activate sets interactMode to true
resetState();
const handler1 = getHandler('activate_buddy_interact');
await handler1({});
if (gachaState.interactMode === true) {
  console.log('✅ Test 1: Activate sets interactMode to true');
  passed++;
} else {
  console.log('❌ Test 1: interactMode not set to true');
  failed++;
}

// Test 2: Activate returns confirmation
resetState();
const result2 = await getHandler('activate_buddy_interact')({});
if (result2.includes('interact') || result2.length > 10) {
  console.log('✅ Test 2: Activate returns confirmation message');
  passed++;
} else {
  console.log('❌ Test 2: No confirmation message');
  failed++;
}

// Test 3: Deactivate sets interactMode to false
resetState();
gachaState.interactMode = true;
await getHandler('deactivate_buddy_interact')({});
if (gachaState.interactMode === false) {
  console.log('✅ Test 3: Deactivate sets interactMode to false');
  passed++;
} else {
  console.log('❌ Test 3: interactMode not set to false');
  failed++;
}

// Test 4: Deactivate returns confirmation
resetState();
gachaState.interactMode = true;
const result4 = await getHandler('deactivate_buddy_interact')({});
if (result4.includes('interact') || result4.length > 10) {
  console.log('✅ Test 4: Deactivate returns confirmation message');
  passed++;
} else {
  console.log('❌ Test 4: No confirmation message');
  failed++;
}

// Test 5: Toggle persistence (activate -> deactivate -> activate)
resetState();
await getHandler('activate_buddy_interact')({});
const isActive1 = gachaState.interactMode;
await getHandler('deactivate_buddy_interact')({});
const isInactive = gachaState.interactMode;
await getHandler('activate_buddy_interact')({});
const isActive2 = gachaState.interactMode;
if (isActive1 === true && isInactive === false && isActive2 === true) {
  console.log('✅ Test 5: Toggle persistence works correctly');
  passed++;
} else {
  console.log('❌ Test 5: Toggle persistence failed');
  failed++;
}

// Test 6: Can toggle multiple times
resetState();
for (let i = 0; i < 5; i++) {
  await getHandler('activate_buddy_interact')({});
  if (gachaState.interactMode !== true) throw new Error('Activate failed');
  await getHandler('deactivate_buddy_interact')({});
  if (gachaState.interactMode !== false) throw new Error('Deactivate failed');
}
console.log('✅ Test 6: Multiple toggles work correctly');
passed++;

console.log('\n' + '═'.repeat(64));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   ✅ ALL TESTS PASSED ✅                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
} else {
  process.exit(1);
}
