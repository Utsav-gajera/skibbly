const EASY_WORDS_BASE = [
  'apple','ball','banana','bed','bird','book','bread','bus','cake','car','cat','chair','clock','cloud','coat','corn','cow','cup','desk','dog','door','duck','egg','eye','fan','fish','flag','flower','fork','frog','game','gift','girl','hat','hill','house','ice','jar','kite','lamp','leaf','lemon','lion','milk','moon','mouse','nest','nose','orange','panda','pen','pencil','phone','pig','pizza','plane','plate','rain','ring','river','road','rock','rose','sand','shoe','ship','shirt','sky','snow','sock','spoon','star','sun','table','train','tree','truck','watch','water','wheel','window','zebra'
];

const EASY_TARGET_COUNT = 1200;

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

export function getEasyWords() {
  return expandToCount(EASY_WORDS_BASE, EASY_TARGET_COUNT);
}

export { EASY_WORDS_BASE };
