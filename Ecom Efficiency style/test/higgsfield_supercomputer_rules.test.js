const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BLOCKED_HIGGSFIELD_PATH_PREFIXES,
  shouldBlockHiggsfieldPath,
  SUPERCOMPUTER_HIDE_SELECTORS,
} = require('../higgsfield_supercomputer_rules');

test('shouldBlockHiggsfieldPath blocks supercomputer routes', () => {
  assert.equal(shouldBlockHiggsfieldPath('/supercomputer'), true);
  assert.equal(shouldBlockHiggsfieldPath('/supercomputer/tools'), true);
  assert.equal(shouldBlockHiggsfieldPath('/pricing'), false);
});

test('shouldBlockHiggsfieldPath blocks marketing-studio routes', () => {
  assert.equal(shouldBlockHiggsfieldPath('/marketing-studio'), true);
  assert.equal(shouldBlockHiggsfieldPath('/marketing-studio/hooks'), true);
  assert.equal(shouldBlockHiggsfieldPath('/marketing-studio-community'), true);
  assert.equal(shouldBlockHiggsfieldPath('/marketing'), false);
});

test('SUPERCOMPUTER_HIDE_SELECTORS covers navbar, card, and banner surfaces', () => {
  assert.ok(BLOCKED_HIGGSFIELD_PATH_PREFIXES.includes('/supercomputer'));
  assert.ok(SUPERCOMPUTER_HIDE_SELECTORS.nav.some((selector) => selector.includes('/supercomputer')));
  assert.ok(SUPERCOMPUTER_HIDE_SELECTORS.card.some((selector) => selector.includes('supercomputer')));
  assert.ok(SUPERCOMPUTER_HIDE_SELECTORS.banner.some((selector) => selector.includes('spc-desktop-banner')));
});
