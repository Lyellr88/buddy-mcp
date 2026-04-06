# Tool Integration Tests

Manual integration tests for buddy-mcp core tools. These test actual tool behavior end-to-end without mocking.

## Files

- `test-pet-buddy.mjs` - Pet affection system (7 tests)
- `reroll-buddy.mjs` - Buddy rerolling mechanics (6 tests)
- `buddy-talk.mjs` - Personality responses (5 tests)
- `interact-mode.mjs` - Activate/deactivate interact mode (6 tests)
- `buddy-card.mjs` - Buddy card display (8 tests)
- `buddy-dex.mjs` - Species dex tracking (6 tests)

## Running Tests

Run all tool tests:
```bash
npm run test:tools
```

Run individual test:
```bash
node tests/tools/pet-buddy.mjs
```

## Notes

- Tests use `.mjs` format (ESM) to directly import compiled dist files
- Not included in `npm run ci` - run separately for integration validation
- Tests reset state between runs, so can be executed multiple times
- Some tests are environment-aware (e.g., reroll_buddy shows "Binary is locked" in test env)
