export type Example = {
  id: string
  title: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'sync-order',
    title: '01 · Synchronous code',
    code: `console.log(1);
console.log(2);
console.log(3);`,
  },
  {
    id: 'nested-calls',
    title: '02 · Nested calls',
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
    title: '03 · Three stack frames',
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
    title: '04 · return from a function',
    code: `function add(a, b) {
  return a + b;
}

console.log(add(2, 3));`,
  },
  {
    id: 'timeout-after-sync',
    title: '05 · Timer after the script',
    code: `console.log('start');
setTimeout(() => console.log('timeout'), 0);
console.log('end');`,
  },
  {
    id: 'zero-delay',
    title: '06 · Zero delay',
    code: `setTimeout(() => console.log('timer'), 0);
console.log('sync');`,
  },
  {
    id: 'two-timeouts',
    title: '07 · Two timers in a row',
    code: `setTimeout(() => console.log(1), 0);
setTimeout(() => console.log(2), 0);
console.log(3);`,
  },
  {
    id: 'delays',
    title: '08 · Delay order',
    code: `console.log('start');

setTimeout(() => console.log('100ms'), 100);
setTimeout(() => console.log('0ms'), 0);
setTimeout(() => console.log('50ms'), 50);

console.log('end');`,
  },
  {
    id: 'promise-executor',
    title: '09 · Synchronous executor',
    code: `console.log(1);

new Promise((resolve) => {
  console.log(2);
  resolve();
});

console.log(3);`,
  },
  {
    id: 'then-after-sync',
    title: '10 · then after the script',
    code: `console.log(1);
Promise.resolve().then(() => console.log(2));
console.log(3);`,
  },
  {
    id: 'two-thens',
    title: '11 · Two microtasks',
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
    title: '14 · then before micro',
    code: `Promise.resolve().then(() => console.log('then'));
queueMicrotask(() => console.log('micro'));
console.log('sync');`,
  },
  {
    id: 'chain',
    title: '15 · then chain',
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
    title: '16 · then returns a number',
    code: `Promise.resolve(1)
  .then((value) => {
    console.log(value);
    return value + 1;
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'two-listeners',
    title: '17 · Two thens on one promise',
    code: `const promise = Promise.resolve();

promise.then(() => console.log(1));
promise.then(() => console.log(2));

console.log(3);`,
  },
  {
    id: 'classic',
    title: '18 · Timeouts and promises',
    code: `setTimeout(() => console.log(1));
Promise.resolve().then(() => console.log(2));
Promise.resolve()
  .then(() => setTimeout(() => console.log(3)));
new Promise(() => console.log(4));
setTimeout(() => console.log(5));`,
  },
  {
    id: 'then-schedules-timeout',
    title: '19 · then schedules a timer',
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
    title: '20 · Timer schedules then',
    code: `setTimeout(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
}, 0);

setTimeout(() => console.log(3), 0);`,
  },
  {
    id: 'nested',
    title: '21 · then inside a timer',
    code: `setTimeout(() => {
  console.log('timeout');
  Promise.resolve().then(() => console.log('inner then'));
}, 0);

Promise.resolve().then(() => console.log('then'));`,
  },
  {
    id: 'micro-schedules-macro',
    title: '22 · then schedules a timer 2',
    code: `setTimeout(() => console.log('macro'), 0);

Promise.resolve().then(() => {
  console.log('micro');
  setTimeout(() => console.log('later'), 0);
});`,
  },
  {
    id: 'nested-timeouts',
    title: '23 · Nested timers',
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
    title: '26 · throw in the executor',
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
    title: '28 · try misses reject',
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
    title: '30 · async without await',
    code: `async function run() {
  console.log(2);
}

console.log(1);
run();
console.log(3);`,
  },
  {
    id: 'two-awaits',
    title: '31 · Two awaits',
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
    title: '32 · async and then',
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
    title: '33 · then returns a promise',
    code: `Promise.resolve(1)
  .then((value) => {
    console.log(value);
    return Promise.resolve(2);
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'chain-three',
    title: '34 · Three thens',
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
    title: '35 · then inside then',
    code: `Promise.resolve().then(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
});

Promise.resolve().then(() => console.log(3));`,
  },
  {
    id: 'queue-inside-then',
    title: '36 · micro inside then',
    code: `Promise.resolve().then(() => {
  console.log(1);
  queueMicrotask(() => console.log(2));
});

Promise.resolve().then(() => console.log(3));`,
  },
  {
    id: 'let-timeout',
    title: '37 · let and a timer',
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
  },
  {
    id: 'var-timeout',
    title: '38 · var and a timer',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
  },
  {
    id: 'loop',
    title: '39 · let and var',
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log('let', i), 0);
}

for (var j = 0; j < 3; j++) {
  setTimeout(() => console.log('var', j), 0);
}`,
  },
  {
    id: 'let-promise',
    title: '40 · let and promises',
    code: `for (let i = 0; i < 3; i++) {
  Promise.resolve().then(() => console.log(i));
}`,
  },
  {
    id: 'var-promise',
    title: '41 · var and promises',
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
    title: '44 · Promise and delays',
    code: `setTimeout(() => console.log('slow'), 100);
Promise.resolve().then(() => console.log('then'));
setTimeout(() => console.log('fast'), 0);
console.log('sync');`,
  },
  {
    id: 'nested-async',
    title: '45 · Nested async',
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
    title: '46 · catch returns a value',
    code: `Promise.reject('x')
  .catch((reason) => {
    console.log(reason);
    return 'ok';
  })
  .then((value) => console.log(value));`,
  },
  {
    id: 'throw-in-then',
    title: '47 · throw inside then',
    code: `Promise.resolve()
  .then(() => {
    throw 'boom';
  })
  .catch((error) => console.log(error));`,
  },
  {
    id: 'mixed',
    title: '48 · Mixed order',
    code: `console.log(1);

setTimeout(() => console.log(2), 0);

Promise.resolve().then(() => console.log(3));

queueMicrotask(() => console.log(4));

console.log(5);`,
  },
  {
    id: 'big-interview',
    title: '49 · A long question',
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
    title: '50 · Microtasks first',
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
    console.log('waiting', value)
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
      console.log('skipped', value)
      return
    }
    fn(value)
    locked = true
    setTimeout(() => {
      locked = false
      console.log('ready again')
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
  {
    id: 'junior-callback',
    title: '53 · Junior · callback',
    code: `function later(callback) {
  setTimeout(callback, 0)
}

console.log('before')
later(() => console.log('callback'))
console.log('after')`,
  },
  {
    id: 'junior-resolve-timeout',
    title: '54 · Junior · resolve in a timer',
    code: `console.log('A')

new Promise((resolve) => {
  console.log('B')
  setTimeout(() => {
    console.log('C')
    resolve()
  }, 0)
}).then(() => console.log('D'))

console.log('E')`,
  },
  {
    id: 'mid-await-yields',
    title: '55 · Mid · await yields',
    code: `console.log('start')

async function run() {
  console.log('body')
  await Promise.resolve()
  console.log('after await')
}

run().then(() => console.log('returned'))
console.log('end')`,
  },
  {
    id: 'mid-extra-tick',
    title: '56 · Mid · extra then tick',
    code: `Promise.resolve()
  .then(() => {
    console.log('A')
    return Promise.resolve()
  })
  .then(() => console.log('B'))

Promise.resolve()
  .then(() => console.log('C'))
  .then(() => console.log('D'))`,
  },
  {
    id: 'mid-sequential-await',
    title: '57 · Mid · awaits in sequence',
    code: `function later(value) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('ready', value)
      resolve()
    }, 0)
  })
}

async function run() {
  await later('a')
  console.log('got a')
  await later('b')
  console.log('got b')
}

run()
console.log('sync')`,
  },
  {
    id: 'mid-finally-then',
    title: '58 · Mid · finally before then',
    code: `Promise.resolve('ok')
  .finally(() => console.log('finally'))
  .then((value) => console.log(value))`,
  },
  {
    id: 'senior-async1',
    title: '59 · Senior · async1 and async2',
    code: `async function async1() {
  console.log('async1 start')
  await async2()
  console.log('async1 end')
}

async function async2() {
  console.log('async2')
}

console.log('script start')
setTimeout(() => console.log('setTimeout'), 0)
async1()

new Promise((resolve) => {
  console.log('promise1')
  resolve()
}).then(() => console.log('promise2'))

console.log('script end')`,
  },
  {
    id: 'senior-timers',
    title: '60 · Senior · timers and a promise',
    code: `console.log('start')

setTimeout(() => console.log('timeout1'), 0)

Promise.resolve().then(() => {
  console.log('promise1')
  setTimeout(() => console.log('timeout2'), 0)
})

setTimeout(() => console.log('timeout3'), 0)
console.log('end')`,
  },
  {
    id: 'senior-finally-reject',
    title: '61 · Senior · finally and reject',
    code: `Promise.reject('fail')
  .finally(() => console.log('finally'))
  .catch((error) => console.log(error))`,
  },
  {
    id: 'staff-checkpoint',
    title: '62 · Staff · microtask between timers',
    code: `setTimeout(() => {
  console.log('t1')
  queueMicrotask(() => console.log('t1 micro'))
}, 0)

setTimeout(() => {
  console.log('t2')
  queueMicrotask(() => console.log('t2 micro'))
}, 0)`,
  },
  {
    id: 'staff-starve',
    title: '63 · Staff · microtasks hold the timer',
    code: `let n = 0

function again() {
  n = n + 1
  console.log(n)
  if (n < 3) queueMicrotask(again)
}

setTimeout(() => console.log('macro'), 0)
queueMicrotask(again)`,
  },
  {
    id: 'staff-mix',
    title: '64 · Staff · queue order',
    code: `console.log(1)

setTimeout(() => console.log(2), 0)
Promise.resolve().then(() => console.log(3))
Promise.resolve().then(() => setTimeout(() => console.log(4), 0))
Promise.resolve().then(() => console.log(5))
setTimeout(() => console.log(6), 0)

console.log(7)`,
  },
  {
    id: 'promise-all',
    title: '65 · Mid · Promise.all',
    code: `function later(value, delay) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay)
  })
}

console.log('sync')
Promise.all([later('slow', 30), later('fast', 10)]).then((values) => console.log(values))`,
  },
  {
    id: 'promise-all-fail',
    title: '66 · Mid · Promise.all rejects',
    code: `Promise.all([Promise.resolve('ok'), Promise.reject('no')])
  .then((values) => console.log(values))
  .catch((error) => console.log(error))`,
  },
  {
    id: 'promise-race',
    title: '67 · Mid · Promise.race',
    code: `function later(value, delay) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay)
  })
}

Promise.race([later('slow', 30), later('fast', 10)]).then((value) => console.log(value))
console.log('sync')`,
  },
  {
    id: 'promise-all-settled',
    title: '68 · Mid · Promise.allSettled',
    code: `Promise.allSettled([Promise.resolve('ok'), Promise.reject('no')]).then((values) => console.log(values))`,
  },
]
