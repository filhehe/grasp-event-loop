export type Example = {
  id: string
  title: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'sync-order',
    title: '01 · Синхронный код',
    code: `console.log(1);
console.log(2);
console.log(3);`,
  },
  {
    id: 'nested-calls',
    title: '02 · Вложенные вызовы',
    code: `function inner() {
  console.log('inner');
}

function outer() {
  console.log('outer');
  inner();
}

outer();`,
  },
  {
    id: 'three-calls',
    title: '03 · Три уровня стека',
    code: `function third() {
  console.log('third');
}

function second() {
  console.log('second');
  third();
}

function first() {
  console.log('first');
  second();
}

first();`,
  },
  {
    id: 'return-value',
    title: '04 · return из функции',
    code: `function add(a, b) {
  return a + b;
}

console.log(add(2, 3));`,
  },
  {
    id: 'timeout-after-sync',
    title: '05 · Таймер после скрипта',
    code: `console.log('start');
setTimeout(() => console.log('timeout'), 0);
console.log('end');`,
  },
  {
    id: 'zero-delay',
    title: '06 · Задержка 0 мс',
    code: `setTimeout(() => console.log('timer'), 0);
console.log('sync');`,
  },
  {
    id: 'two-timeouts',
    title: '07 · Два таймера подряд',
    code: `setTimeout(() => console.log(1), 0);
setTimeout(() => console.log(2), 0);
console.log(3);`,
  },
  {
    id: 'delays',
    title: '08 · Порядок задержек',
    code: `console.log('start');

setTimeout(() => console.log('100ms'), 100);
setTimeout(() => console.log('0ms'), 0);
setTimeout(() => console.log('50ms'), 50);

console.log('end');`,
  },
  {
    id: 'promise-executor',
    title: '09 · Executor синхронный',
    code: `console.log(1);

new Promise((resolve) => {
  console.log(2);
  resolve();
});

console.log(3);`,
  },
  {
    id: 'then-after-sync',
    title: '10 · then после скрипта',
    code: `console.log(1);
Promise.resolve().then(() => console.log(2));
console.log(3);`,
  },
  {
    id: 'two-thens',
    title: '11 · Две микротаски',
    code: `Promise.resolve().then(() => console.log(1));
Promise.resolve().then(() => console.log(2));
console.log(3);`,
  },
  {
    id: 'order',
    title: '12 · Sync, micro, macro',
    code: `console.log('start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => console.log('promise'));

console.log('end');`,
  },
  {
    id: 'micro',
    title: '13 · queueMicrotask',
    code: `console.log('script');

queueMicrotask(() => console.log('micro'));

setTimeout(() => console.log('macro'), 0);

Promise.resolve().then(() => console.log('then'));`,
  },
  {
    id: 'micro-vs-then',
    title: '14 · then раньше micro',
    code: `Promise.resolve().then(() => console.log('then'));
queueMicrotask(() => console.log('micro'));
console.log('sync');`,
  },
  {
    id: 'chain',
    title: '15 · Цепочка then',
    code: `console.log('start');

Promise.resolve('A')
  .then((value) => {
    console.log(value);
    return 'B';
  })
  .then((value) => {
    console.log(value);
  });

console.log('end');`,
  },
  {
    id: 'then-return',
    title: '16 · then возвращает число',
    code: `Promise.resolve(1)
  .then((value) => {
    console.log(value);
    return value + 1;
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'two-listeners',
    title: '17 · Два then на промисе',
    code: `const promise = Promise.resolve();

promise.then(() => console.log(1));
promise.then(() => console.log(2));

console.log(3);`,
  },
  {
    id: 'classic',
    title: '18 · Таймауты и промисы',
    code: `setTimeout(() => console.log(1));
Promise.resolve().then(() => console.log(2));
Promise.resolve()
  .then(() => setTimeout(() => console.log(3)));
new Promise(() => console.log(4));
setTimeout(() => console.log(5));`,
  },
  {
    id: 'then-schedules-timeout',
    title: '19 · then ставит таймер',
    code: `console.log(1);

Promise.resolve().then(() => {
  console.log(2);
  setTimeout(() => console.log(3), 0);
});

setTimeout(() => console.log(4), 0);
console.log(5);`,
  },
  {
    id: 'timeout-schedules-then',
    title: '20 · Таймер ставит then',
    code: `setTimeout(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
}, 0);

setTimeout(() => console.log(3), 0);`,
  },
  {
    id: 'nested',
    title: '21 · then внутри таймера',
    code: `setTimeout(() => {
  console.log('timeout');
  Promise.resolve().then(() => console.log('inner then'));
}, 0);

Promise.resolve().then(() => console.log('then'));`,
  },
  {
    id: 'micro-schedules-macro',
    title: '22 · then ставит таймер 2',
    code: `setTimeout(() => console.log('macro'), 0);

Promise.resolve().then(() => {
  console.log('micro');
  setTimeout(() => console.log('later'), 0);
});`,
  },
  {
    id: 'nested-timeouts',
    title: '23 · Вложенные таймеры',
    code: `console.log(1);

setTimeout(() => {
  console.log(2);
  setTimeout(() => console.log(3), 0);
}, 0);

setTimeout(() => console.log(4), 0);`,
  },
  {
    id: 'catch',
    title: '24 · catch',
    code: `Promise.reject('error').catch((reason) => console.log(reason));
console.log('sync');`,
  },
  {
    id: 'finally',
    title: '25 · finally',
    code: `console.log('sync');

Promise.resolve('ok')
  .finally(() => console.log('finally'))
  .then((value) => console.log(value));`,
  },
  {
    id: 'executor-throw',
    title: '26 · throw в executor',
    code: `console.log(1);

new Promise(() => {
  throw 'fail';
});

console.log(2);`,
  },
  {
    id: 'try-catch',
    title: '27 · try / catch',
    code: `try {
  console.log(1);
  throw 'boom';
  console.log(2);
} catch (error) {
  console.log('caught');
}

console.log(3);`,
  },
  {
    id: 'try-misses-reject',
    title: '28 · try не ловит reject',
    code: `console.log(1);

try {
  Promise.reject('later');
} catch (error) {
  console.log('caught');
}

console.log(2);`,
  },
  {
    id: 'async',
    title: '29 · async / await',
    code: `console.log(1);

async function run() {
  console.log(2);
  await Promise.resolve();
  console.log(4);
}

run();

console.log(3);`,
  },
  {
    id: 'async-without-await',
    title: '30 · async без await',
    code: `async function run() {
  console.log(2);
}

console.log(1);
run();
console.log(3);`,
  },
  {
    id: 'two-awaits',
    title: '31 · Два await',
    code: `async function run() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
  await Promise.resolve();
  console.log(3);
}

run();
console.log(4);`,
  },
  {
    id: 'async-and-then',
    title: '32 · async и then',
    code: `console.log(1);

async function run() {
  console.log(2);
  await Promise.resolve();
  console.log(4);
}

run();
Promise.resolve().then(() => console.log(5));
console.log(3);`,
  },
  {
    id: 'then-returns-promise',
    title: '33 · then возвращает промис',
    code: `Promise.resolve(1)
  .then((value) => {
    console.log(value);
    return Promise.resolve(2);
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'chain-three',
    title: '34 · Три then',
    code: `Promise.resolve('a')
  .then((value) => {
    console.log(value);
    return 'b';
  })
  .then((value) => {
    console.log(value);
    return 'c';
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'micro-in-micro',
    title: '35 · then внутри then',
    code: `Promise.resolve().then(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
});

Promise.resolve().then(() => console.log(3));`,
  },
  {
    id: 'queue-inside-then',
    title: '36 · micro внутри then',
    code: `Promise.resolve().then(() => {
  console.log(1);
  queueMicrotask(() => console.log(2));
});

Promise.resolve().then(() => console.log(3));`,
  },
  {
    id: 'let-timeout',
    title: '37 · let и таймер',
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
  },
  {
    id: 'var-timeout',
    title: '38 · var и таймер',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
  },
  {
    id: 'loop',
    title: '39 · let и var',
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log('let', i), 0);
}

for (var j = 0; j < 3; j++) {
  setTimeout(() => console.log('var', j), 0);
}`,
  },
  {
    id: 'let-promise',
    title: '40 · let и промисы',
    code: `for (let i = 0; i < 3; i++) {
  Promise.resolve().then(() => console.log(i));
}`,
  },
  {
    id: 'var-promise',
    title: '41 · var и промисы',
    code: `for (var i = 0; i < 3; i++) {
  Promise.resolve().then(() => console.log(i));
}`,
  },
  {
    id: 'clear-timeout',
    title: '42 · clearTimeout',
    code: `const id = setTimeout(() => console.log('no'), 0);
clearTimeout(id);
setTimeout(() => console.log('yes'), 0);`,
  },
  {
    id: 'interval',
    title: '43 · setInterval',
    code: `let count = 0;

const id = setInterval(() => {
  count += 1;
  console.log(count);
  if (count === 3) clearInterval(id);
}, 200);`,
  },
  {
    id: 'promise-vs-delays',
    title: '44 · Промис и задержки',
    code: `setTimeout(() => console.log('slow'), 100);
Promise.resolve().then(() => console.log('then'));
setTimeout(() => console.log('fast'), 0);
console.log('sync');`,
  },
  {
    id: 'nested-async',
    title: '45 · Вложенный async',
    code: `async function inner() {
  console.log('inner');
  await Promise.resolve();
  console.log('inner after');
}

async function outer() {
  console.log('outer');
  await inner();
  console.log('outer after');
}

outer();
console.log('sync');`,
  },
  {
    id: 'catch-recover',
    title: '46 · catch возвращает значение',
    code: `Promise.reject('x')
  .catch((reason) => {
    console.log(reason);
    return 'ok';
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'throw-in-then',
    title: '47 · throw внутри then',
    code: `Promise.resolve()
  .then(() => {
    throw 'boom';
  })
  .catch((error) => console.log(error));`,
  },
  {
    id: 'mixed',
    title: '48 · Смешанный порядок',
    code: `console.log(1);

setTimeout(() => console.log(2), 0);

Promise.resolve().then(() => console.log(3));

queueMicrotask(() => console.log(4));

console.log(5);`,
  },
  {
    id: 'big-interview',
    title: '49 · Большой вопрос',
    code: `console.log('start');

setTimeout(() => console.log('timeout 1'), 0);

Promise.resolve()
  .then(() => {
    console.log('promise 1');
    setTimeout(() => console.log('timeout 2'), 0);
  })
  .then(() => console.log('promise 2'));

queueMicrotask(() => console.log('micro'));

console.log('end');`,
  },
  {
    id: 'micro-drain',
    title: '50 · Сначала все микротаски',
    code: `setTimeout(() => console.log('macro 1'), 0);

Promise.resolve()
  .then(() => console.log('micro 1'))
  .then(() => console.log('micro 2'))
  .then(() => console.log('micro 3'));

setTimeout(() => console.log('macro 2'), 0);`,
  },
  {
    id: 'debounce',
    title: '51 · debounce',
    code: `function debounce(fn, delay) {
  let id
  function debounced(value) {
    clearTimeout(id)
    id = setTimeout(() => fn(value), delay)
    console.log('ждем', value)
  }
  return debounced
}

function save(value) {
  console.log('save', value)
}

const debounced = debounce(save, 100)
debounced('a')
debounced('b')
debounced('c')`,
  },
  {
    id: 'throttle',
    title: '52 · throttle',
    code: `function throttle(fn, delay) {
  let locked = false
  function throttled(value) {
    if (locked) {
      console.log('мимо', value)
      return
    }
    fn(value)
    locked = true
    setTimeout(() => {
      locked = false
      console.log('снова можно')
    }, delay)
  }
  return throttled
}

function send(value) {
  console.log('send', value)
}

const throttled = throttle(send, 100)
throttled('a')
throttled('b')
throttled('c')
setTimeout(() => throttled('d'), 100)`,
  },
]
