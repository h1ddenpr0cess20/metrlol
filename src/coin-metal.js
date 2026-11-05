const DISTRICT_METALS = Object.freeze({
  'Portland Heights': 'copper',
  'The Alignment District': 'copper',
  'The Pause Compound': 'copper',
  'The Ivory Tower': 'silver',
  'The Timeline': 'silver',
  'Brussels-sur-Mer': 'silver',
  'Hype Valley': 'gold',
  'The Compute Farm': 'gold',
  'The Information Superhighway': 'gold',
  'The Far Side': 'gold',
});

/** The coin denomination is tied to the named district containing the pickup. */
export function coinMetalAt(map, x, z) {
  const district = map?.districtAt?.(x, z);
  return DISTRICT_METALS[district?.name] ?? 'copper';
}
