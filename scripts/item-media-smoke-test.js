/* Small, dependency-free behavior tests for the centralized item-media resolver. */
const assert = require('node:assert/strict');
require('../core/tarkov-item-media.js');

const media = globalThis.TarkovItemMedia;
assert.ok(media && typeof media.icon === 'function', 'TarkovItemMedia.icon must be available');

const weapon = {
  id: 'm4a1-test',
  name: 'M4A1',
  types: ['gun'],
  iconLink: 'https://example.invalid/base-receiver.png',
  properties: {
    propertiesType: 'ItemPropertiesWeapon',
    defaultPreset: { image512pxLink: 'https://example.invalid/standard-m4a1.png' }
  }
};
assert.equal(
  media.icon(weapon),
  'https://example.invalid/standard-m4a1.png',
  'weapons with a default preset must use its standard weapon image'
);

const regularItem = {
  id: 'ammo-test',
  iconLink: 'https://example.invalid/ammo.png',
  properties: { propertiesType: 'ItemPropertiesAmmunition' }
};
assert.equal(
  media.icon(regularItem),
  'https://example.invalid/ammo.png',
  'non-weapon items must keep their normal item image'
);

const decorated = media.decorate(weapon);
assert.equal(decorated.displayIconLink, 'https://example.invalid/standard-m4a1.png');
assert.equal(decorated.sourceIconLink, 'https://example.invalid/base-receiver.png');
assert.equal(weapon.iconLink, 'https://example.invalid/base-receiver.png', 'decoration must not mutate API source data');

console.log('Item-media smoke tests: PASS (4 assertions)');
