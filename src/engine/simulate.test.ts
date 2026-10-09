import assert from 'node:assert/strict'
import { EXAMPLE_NOTES } from '../exampleNotes.ts'
import { EXAMPLES } from '../examples.ts'
import { isDequeue, planFlights, type CardSpot } from '../flights.ts'
import { simulate, SyntaxFailure } from './simulate.ts'

function logs(code: string) {
  const steps = simulate(code)
  const last = steps.at(-1)
  assert.ok(last, 'expected steps')
  return {
    steps,
    last,
    output: last.console.filter((entry) => entry.kind === 'log').map((entry) => entry.text),
  }
}

function expectLogs(code: string, expected: string[]) {
  const result = logs(code)
  assert.deepEqual(
    result.output,
    expected,
    result.steps.map((step) => step.message).join('\n'),
  )
  assert.equal(result.last.callStack.length, 0, 'call stack should be empty')
  assert.equal(result.last.macrotasks.length, 0, 'macrotask queue should be empty')
  assert.equal(result.last.microtasks.length, 0, 'microtask queue should be empty')
}

expectLogs(
  `setTimeout(() => console.log(1));
Promise.resolve().then(() => console.log(2));
Promise.resolve()
  .then(() => setTimeout(() => console.log(3)));
new Promise(() => console.log(4));
setTimeout(() => console.log(5));`,
  ['4', '2', '1', '5', '3'],
)

const classic = logs(`setTimeout(() => console.log(1));
Promise.resolve().then(() => console.log(2));
Promise.resolve()
  .then(() => setTimeout(() => console.log(3)));
new Promise(() => console.log(4));
setTimeout(() => console.log(5));`)

assert.ok(
  classic.steps.some(
    (step) =>
      step.console.map((entry) => entry.text).join() === '4' &&
      step.microtasks.length === 2 &&
      step.callStack.length > 0 &&
      step.callStack.every((frame) => frame.label !== '(script)'),
  ),
  'log 4 happens during synchronous execution, without a script frame',
)
assert.ok(
  classic.steps.some((step) => step.console.map((entry) => entry.text).join(',') === '4,2' && !step.console.some((entry) => entry.text === '1')),
  'microtask log 2 runs before macrotask log 1',
)

expectLogs(
  `console.log('start');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('end');`,
  ['start', 'end', 'promise', 'timeout'],
)

expectLogs(
  `console.log('start');
setTimeout(() => console.log('100ms'), 100);
setTimeout(() => console.log('0ms'), 0);
setTimeout(() => console.log('50ms'), 50);
console.log('end');`,
  ['start', 'end', '0ms', '50ms', '100ms'],
)

expectLogs(
  `console.log('start');
Promise.resolve('A')
  .then((value) => {
    console.log(value);
    return 'B';
  })
  .then((value) => {
    console.log(value);
  });
console.log('end');`,
  ['start', 'end', 'A', 'B'],
)

expectLogs(
  `console.log(1);
async function run() {
  console.log(2);
  await Promise.resolve();
  console.log(4);
}
run();
console.log(3);`,
  ['1', '2', '3', '4'],
)

expectLogs(
  `async function run() {
  const x = await Promise.resolve(7);
  console.log(x);
}
run();`,
  ['7'],
)

expectLogs(
  `console.log('script');
queueMicrotask(() => console.log('micro'));
setTimeout(() => console.log('macro'), 0);
Promise.resolve().then(() => console.log('then'));`,
  ['script', 'micro', 'then', 'macro'],
)

expectLogs(
  `setTimeout(() => {
  console.log('timeout');
  Promise.resolve().then(() => console.log('inner then'));
}, 0);
Promise.resolve().then(() => console.log('then'));`,
  ['then', 'timeout', 'inner then'],
)

expectLogs(
  `console.log('a');
setTimeout(() => console.log('b'), 0);
Promise.resolve().then(() => {
  console.log('c');
  Promise.resolve().then(() => console.log('d'));
});
console.log('e');`,
  ['a', 'e', 'c', 'd', 'b'],
)

expectLogs(
  `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log('let', i), 0);
}
for (var j = 0; j < 3; j++) {
  setTimeout(() => console.log('var', j), 0);
}`,
  ['let 0', 'let 1', 'let 2', 'var 3', 'var 3', 'var 3'],
)

expectLogs(
  `const id = setTimeout(() => console.log('no'), 0);
clearTimeout(id);
setTimeout(() => console.log('yes'), 0);`,
  ['yes'],
)

expectLogs(
  `Promise.reject('boom').catch((error) => console.log(error));`,
  ['boom'],
)

expectLogs(
  `new Promise((resolve) => {
  console.log('executor');
  resolve('ok');
}).then((value) => console.log(value));`,
  ['executor', 'ok'],
)

const rejected = logs(`Promise.reject('boom');`)
assert.ok(rejected.last.console.some((entry) => entry.kind === 'error' && entry.text.includes('boom')))

assert.throws(() => simulate('function ('), SyntaxFailure)

const failure = logs(`notDefined();`)
assert.equal(failure.last.console.at(-1)?.kind, 'error')

expectLogs(
  `let count = 0;
const id = setInterval(() => {
  count += 1;
  console.log(count);
  if (count === 3) clearInterval(id);
}, 200);`,
  ['1', '2', '3'],
)

const nested = logs(`function inner() {
  console.log('inner');
}

function outer() {
  console.log('outer');
  inner();
}

outer();`)
assert.deepEqual(nested.output, ['outer', 'inner'])
assert.deepEqual(
  nested.steps
    .filter((step) => step.line != null)
    .map((step) => `${step.line}:${step.callStack.map((frame) => frame.label).join('>')}`),
  [
    '1:',
    '10:',
    '5:outer',
    '6:outer>console.log',
    '7:outer',
    '1:outer>inner',
    '2:outer>inner>console.log',
  ],
)

function spot(id: string, label: string, zone: CardSpot['zone'], left: number): CardSpot {
  return { id, label, meta: '', zone, rect: { left, top: 10, width: 120, height: 32 } }
}

const moved = planFlights(
  [spot('web', '() => console.log(1)', 'web', 40)],
  [spot('macro', '() => console.log(1)', 'macro', 200)],
)
assert.equal(moved.length, 1)
assert.equal(moved[0].hideId, 'macro')
assert.equal(moved[0].from.left, 40)
assert.equal(moved[0].to.left, 200)

const spawned = planFlights(
  [],
  [spot('stack', 'setTimeout', 'stack', 10), spot('web', '() => console.log(1)', 'web', 300)],
)
assert.equal(spawned.length, 1)
assert.equal(spawned[0].hideId, 'web')
assert.equal(spawned[0].from.left, 10)

const picked = planFlights(
  [spot('micro', '() => console.log(2)', 'micro', 80)],
  [spot('frame', '() => console.log(2)', 'stack', 20)],
)
assert.equal(picked[0].from.left, 80)
assert.equal(picked[0].to.left, 20)

assert.equal(EXAMPLES.length, 68)
assert.deepEqual(
  EXAMPLES.map((example) => example.title.slice(0, 2)),
  Array.from({ length: 68 }, (_, index) => String(index + 1).padStart(2, '0')),
)
assert.deepEqual(
  EXAMPLES.map((example) => example.id).sort(),
  Object.keys(EXAMPLE_NOTES).sort(),
)
for (const example of EXAMPLES) {
  const note = EXAMPLE_NOTES[example.id]
  assert.ok(note.answer.length > 20, example.id)
  assert.ok(['junior', 'mid', 'senior', 'staff'].includes(note.level), example.id)
}

const interviewLogs: Record<string, string[]> = {
  'sync-order': ['1', '2', '3'],
  'nested-calls': ['outer', 'inner'],
  'three-calls': ['first', 'second', 'third'],
  'return-value': ['5'],
  'timeout-after-sync': ['start', 'end', 'timeout'],
  'zero-delay': ['sync', 'timer'],
  'two-timeouts': ['3', '1', '2'],
  delays: ['start', 'end', '0ms', '50ms', '100ms'],
  'promise-executor': ['1', '2', '3'],
  'then-after-sync': ['1', '3', '2'],
  'two-thens': ['3', '1', '2'],
  order: ['start', 'end', 'promise', 'timeout'],
  micro: ['script', 'micro', 'then', 'macro'],
  'micro-vs-then': ['sync', 'then', 'micro'],
  chain: ['start', 'end', 'A', 'B'],
  'then-return': ['1', '2'],
  'two-listeners': ['3', '1', '2'],
  classic: ['4', '2', '1', '5', '3'],
  'then-schedules-timeout': ['1', '5', '2', '4', '3'],
  'timeout-schedules-then': ['1', '2', '3'],
  nested: ['then', 'timeout', 'inner then'],
  'micro-schedules-macro': ['micro', 'macro', 'later'],
  'nested-timeouts': ['1', '2', '4', '3'],
  catch: ['sync', 'error'],
  finally: ['sync', 'finally', 'ok'],
  'executor-throw': ['1', '2'],
  'try-catch': ['1', 'caught', '3'],
  'try-misses-reject': ['1', '2'],
  async: ['1', '2', '3', '4'],
  'async-without-await': ['1', '2', '3'],
  'two-awaits': ['1', '4', '2', '3'],
  'async-and-then': ['1', '2', '3', '4', '5'],
  'then-returns-promise': ['1', '2'],
  'chain-three': ['a', 'b', 'c'],
  'micro-in-micro': ['1', '3', '2'],
  'queue-inside-then': ['1', '3', '2'],
  'let-timeout': ['0', '1', '2'],
  'var-timeout': ['3', '3', '3'],
  loop: ['let 0', 'let 1', 'let 2', 'var 3', 'var 3', 'var 3'],
  'let-promise': ['0', '1', '2'],
  'var-promise': ['3', '3', '3'],
  'clear-timeout': ['yes'],
  interval: ['1', '2', '3'],
  'promise-vs-delays': ['sync', 'then', 'fast', 'slow'],
  'nested-async': ['outer', 'inner', 'sync', 'inner after', 'outer after'],
  'catch-recover': ['x', 'ok'],
  'throw-in-then': ['boom'],
  mixed: ['1', '5', '3', '4', '2'],
  'big-interview': ['start', 'end', 'promise 1', 'micro', 'promise 2', 'timeout 1', 'timeout 2'],
  'micro-drain': ['micro 1', 'micro 2', 'micro 3', 'macro 1', 'macro 2'],
  debounce: ['waiting a', 'waiting b', 'waiting c', 'save c'],
  throttle: ['send a', 'skipped b', 'skipped c', 'ready again', 'send d', 'ready again'],
  'junior-callback': ['before', 'after', 'callback'],
  'junior-resolve-timeout': ['A', 'B', 'E', 'C', 'D'],
  'mid-await-yields': ['start', 'body', 'end', 'after await', 'returned'],
  'mid-extra-tick': ['A', 'C', 'D', 'B'],
  'mid-sequential-await': ['sync', 'ready a', 'got a', 'ready b', 'got b'],
  'mid-finally-then': ['finally', 'ok'],
  'senior-async1': ['script start', 'async1 start', 'async2', 'promise1', 'script end', 'async1 end', 'promise2', 'setTimeout'],
  'senior-timers': ['start', 'end', 'promise1', 'timeout1', 'timeout3', 'timeout2'],
  'senior-finally-reject': ['finally', 'fail'],
  'staff-checkpoint': ['t1', 't1 micro', 't2', 't2 micro'],
  'staff-starve': ['1', '2', '3', 'macro'],
  'staff-mix': ['1', '7', '3', '5', '2', '6', '4'],
  'promise-all': ['sync', '[slow, fast]'],
  'promise-all-fail': ['no'],
  'promise-race': ['sync', 'fast'],
  'promise-all-settled': ['[{status: fulfilled, value: ok}, {status: rejected, reason: no}]'],
}

for (const example of EXAMPLES) {
  const steps = simulate(example.code)
  const last = steps.at(-1)
  assert.ok(last, example.id)
  assert.deepEqual(
    last.console.filter((entry) => entry.kind === 'log').map((entry) => entry.text),
    interviewLogs[example.id],
    example.id,
  )
  if (example.id === 'promise-all-fail' || example.id === 'promise-all-settled') {
    assert.deepEqual(
      last.console.filter((entry) => entry.kind === 'error'),
      [],
      example.id,
    )
  }
}

assert.equal(isDequeue('Event Loop takes the microtask "fn" and puts it on the Call Stack'), true)
assert.equal(isDequeue('await finished — "run" is back on the Call Stack'), true)
assert.equal(isDequeue('The Call Stack is empty. The Event Loop will take a macrotask'), false)

console.log(`ok ${classic.steps.length} steps in the main example`)
