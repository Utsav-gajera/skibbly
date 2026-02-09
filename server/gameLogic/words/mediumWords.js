const MEDIUM_WORDS_BASE = [
  'airplane','bottle','bridge','camera','castle','cactus','chicken','coconut','diamond','dolphin','dragon','engine','feather','garden','guitar','hammer','helmet','island','jacket','jungle','kitchen','ladder','magnet','market','mirror','monkey','mountain','notebook','ocean','pancake','pillow','pirate','pocket','potato','rabbit','rocket','saddle','school','shower','skate','snake','soccer','spider','squash','stadium','station','strawberry','suitcase','tiger','tomato','tractor','tunnel','unicorn','village','volcano','wallet','whistle','window','yogurt','zombie','butterfly','computer','elephant','fireworks','helicopter','keyboard','microscope','octopus','pyramid','rainbow','sandwich','spaceship','telescope','toothbrush','treasure','waterfall'
];

const MEDIUM_TARGET_COUNT = 850;

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

export function getMediumWords() {
  return expandToCount(MEDIUM_WORDS_BASE, MEDIUM_TARGET_COUNT);
}

export { MEDIUM_WORDS_BASE };
