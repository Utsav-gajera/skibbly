const HARD_WORDS_BASE = [
  'abacus','accordion','airship','alchemist','amphibian','anchorage','asteroid','astronomy','avalanche','backpack','badminton','barometer','barricade','beehive','blueprint','bobsled','boomerang','camouflage','carabiner','carousel','cartography','catapult','cathedral','compass','constellation','crocodile','cryptography','cylinder','dandelion','decathlon','dentist','diorama','dragonfly','earthquake','ecosystem','escalator','expedition','federation','fossil','fountain','furniture','galaxy','gasoline','gondola','graphite','greenhouse','harpoon','hazelnut','hologram','horizon','hurricane','igloo','illustration','incubator','inference','javelin','kaleidoscope','lantern','lighthouse','locomotive','magician','marathon','marshmallow','mechanism','microchip','migration','millennium','minotaur','nebula','navigator','obsidian','orchestra','parachute','pavilion','pendulum','perimeter','pharaoh','phonograph','plankton','platform','portfolio','precipice','prototype','pyramidion','quarantine','quicksand','radiator','raccoon','reliquary','satellite','scarecrow','skeleton','skyscraper','spectrum','sphinx','squid','stethoscope','submarine','synonym','tarantula','telegraph','thermometer','tornado','trajectory','triathlon','turbine','umbrella','valkyrie','vampire','volcano','voyager','waterwheel','wavelength','xylophone','yacht','zephyr'
];

const HARD_TARGET_COUNT = 500;

function expandToCount(base, count) {
  if (base.length >= count) return base.slice(0, count);
  const result = [];
  let i = 0;
  while (result.length < count) {
    result.push(base[i % base.length]);
    i += 1;
  }
  return result;
}

export function getHardWords() {
  return expandToCount(HARD_WORDS_BASE, HARD_TARGET_COUNT);
}

export { HARD_WORDS_BASE };
