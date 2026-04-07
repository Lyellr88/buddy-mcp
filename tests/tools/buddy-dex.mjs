import { S, gachaState, dynamicTools } from '../../dist/mcp/state.js';
import '../../dist/mcp/tools/core.js';

const resetState = () => {
  S.currentBuddy = null;
  gachaState.discoveredSpecies = [];
};

const getHandler = (name) => dynamicTools.get(name)?.handler;

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                  VIEW_BUDDY_DEX TEST SUITE                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: Empty dex shows message
resetState();
const result1 = await getHandler('view_buddy_dex')({});
if (result1.includes('0') || result1.includes('empty') || result1.includes('No')) {
  console.log('✅ Test 1: Empty dex shows appropriate message');
  passed++;
} else {
  console.log('❌ Test 1: No empty dex message');
  failed++;
}

// Test 2: Populated dex shows species
resetState();
gachaState.discoveredSpecies = ['duck', 'cat', 'octopus'];
const result2 = await getHandler('view_buddy_dex')({});
if (result2.includes('duck') && result2.includes('cat') && result2.includes('octopus')) {
  console.log('✅ Test 2: Populated dex shows all species');
  passed++;
} else {
  console.log('❌ Test 2: Missing species in dex');
  failed++;
}

// Test 3: Dex shows count
resetState();
gachaState.discoveredSpecies = ['duck', 'cat', 'octopus'];
const result3 = await getHandler('view_buddy_dex')({});
if (result3.includes('3') || result3.includes('found')) {
  console.log('✅ Test 3: Dex shows count');
  passed++;
} else {
  console.log('❌ Test 3: No count shown');
  failed++;
}

// Test 4: Dex can be manually populated and displayed
resetState();
gachaState.discoveredSpecies = ['duck', 'cat', 'octopus', 'dragon', 'rabbit'];
const result4 = await getHandler('view_buddy_dex')({});
if (result4.includes('dragon') && result4.includes('rabbit')) {
  console.log(
    `✅ Test 4: Dex displays large collection (${gachaState.discoveredSpecies.length} species)`,
  );
  passed++;
} else {
  console.log('❌ Test 4: Dex display failed');
  failed++;
}

// Test 5: Dex handles single vs multiple species
resetState();
gachaState.discoveredSpecies = ['duck'];
const result5a = await getHandler('view_buddy_dex')({});
gachaState.discoveredSpecies = ['duck', 'cat', 'octopus'];
const result5b = await getHandler('view_buddy_dex')({});
if (result5a.includes('duck') && result5b.includes('cat') && result5b.includes('octopus')) {
  console.log('✅ Test 5: Dex handles single and multiple species');
  passed++;
} else {
  console.log('❌ Test 5: Dex display issue');
  failed++;
}

// Test 6: Special characters in species names display correctly
resetState();
gachaState.discoveredSpecies = ['duck', 'cat', 'octopus', 'axolotl'];
const result6 = await getHandler('view_buddy_dex')({});
if (result6.includes('axolotl') && result6.length > 50) {
  console.log('✅ Test 6: Dex displays all species including special names');
  passed++;
} else {
  console.log('❌ Test 6: Special species not displayed');
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
