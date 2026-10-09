export type Level = 'junior' | 'mid' | 'senior' | 'staff'

export const LEVELS = [
  { id: 'all', label: 'All' },
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid' },
  { id: 'senior', label: 'Senior' },
  { id: 'staff', label: 'Staff' },
] as const

export type LevelFilter = (typeof LEVELS)[number]['id']

export const EXAMPLE_NOTES: Record<string, { level: Level; answer: string }> = {
  'sync-order': {
    level: 'junior',
    answer: 'Three calls in a row, with no timers and no promises. The console prints 1, then 2, then 3.',
  },
  'nested-calls': {
    level: 'junior',
    answer: 'outer logs itself first and only then calls inner. The console shows outer, then inner.',
  },
  'three-calls': {
    level: 'junior',
    answer: 'The stack grows upward: first calls second, second calls third. The logs follow the path inward: first, second, third.',
  },
  'return-value': {
    level: 'junior',
    answer: 'add(2, 3) runs immediately and returns 5 in the same moment. There is no queue. The console has one line: 5.',
  },
  'timeout-after-sync': {
    level: 'junior',
    answer: 'start and end print immediately. A timer, even at zero, waits until the script finishes: start, end, timeout.',
  },
  'zero-delay': {
    level: 'junior',
    answer: 'The timer is registered before console.log, and 0 ms still leaves it second. First sync, then timer.',
  },
  'two-timeouts': {
    level: 'junior',
    answer: 'The plain log is first, that is 3. Two timers with the same delay leave in the order they were registered: 1, then 2.',
  },
  delays: {
    level: 'junior',
    answer: 'start and end run immediately. After that the timers follow their delays, not the line order in the source: 0ms, then 50ms, then 100ms.',
  },
  'promise-executor': {
    level: 'junior',
    answer: 'The function inside new Promise runs immediately. There is no then here, so everything is synchronous: 1, then 2, then 3.',
  },
  'then-after-sync': {
    level: 'junior',
    answer: '1 and 3 print immediately. 2 sits in then and waits for the script to finish, so it is last.',
  },
  'two-thens': {
    level: 'junior',
    answer: '3 is a plain log, so it is first. Both thens are already queued and run next, in order: 1, then 2.',
  },
  order: {
    level: 'junior',
    answer: 'start and end run immediately. promise is a microtask, so it runs before the timer. timeout is last.',
  },
  micro: {
    level: 'mid',
    answer: 'queueMicrotask was registered before then, so micro runs before then. The timer macro is last.',
  },
  'micro-vs-then': {
    level: 'mid',
    answer: 'sync prints immediately. then was registered before queueMicrotask, so next comes then, and only then micro.',
  },
  chain: {
    level: 'mid',
    answer: 'start and end run immediately. Then the chain: first A, that then returns B, and the next then prints B.',
  },
  'then-return': {
    level: 'mid',
    answer: 'The first then receives 1 and prints it, then returns 2. The next then prints 2. Both steps are microtasks.',
  },
  'two-listeners': {
    level: 'mid',
    answer: '3 prints immediately. One promise has two thens, and they line up one after the other: first 1, then 2.',
  },
  classic: {
    level: 'mid',
    answer: '4 is printed by the function inside new Promise, immediately. 2 is a then, so it runs before the timers. Timers 1 and 5 were registered in source order, and 3 was scheduled later from inside then, so 3 is last.',
  },
  'then-schedules-timeout': {
    level: 'mid',
    answer: '1 and 5 run immediately, then microtask 2. Timer 4 was scheduled in the script, and 3 was scheduled later from inside then, so 3 is last.',
  },
  'timeout-schedules-then': {
    level: 'mid',
    answer: 'The first timer prints 1 and schedules a then. That then, line 2, runs before the second timer and its line 3.',
  },
  nested: {
    level: 'mid',
    answer: 'The then registered in the script runs before the timer. Inside the timer, its own then prints inner then right after timeout.',
  },
  'micro-schedules-macro': {
    level: 'mid',
    answer: 'The microtask micro runs first. The timer that was there from the start prints macro. later was scheduled from the microtask, so it is last.',
  },
  'nested-timeouts': {
    level: 'mid',
    answer: '1 runs immediately. The first timer prints 2 and only then schedules the timer for 3. Timer 4 was already in the queue, so it runs before 3.',
  },
  catch: {
    level: 'junior',
    answer: 'sync prints immediately. reject does not stop the script: catch receives error after the script, as a microtask.',
  },
  finally: {
    level: 'mid',
    answer: 'sync runs immediately. Then finally, and the following then receives the same ok: this finally does not replace the value.',
  },
  'executor-throw': {
    level: 'mid',
    answer: '1 and 2 print immediately: a throw inside new Promise does not stop the script, it only rejects the promise. There is no catch, so the rejection stays unhandled.',
  },
  'try-catch': {
    level: 'junior',
    answer: 'throw is caught on the spot, so line 2 after it does not run. The console shows 1, caught, and 3.',
  },
  'try-misses-reject': {
    level: 'mid',
    answer: 'try/catch catches nothing here. 1 and 2 print, and caught does not: the reject happens later and stays unhandled.',
  },
  async: {
    level: 'mid',
    answer: '1, 2, and 3 run immediately: until await, the function does not stop the rest of the script. 4 prints after await, so it is last.',
  },
  'async-without-await': {
    level: 'mid',
    answer: 'The function has no await, so it has nothing to wait for. Everything runs immediately: 1, 2, 3.',
  },
  'two-awaits': {
    level: 'mid',
    answer: '1 prints before the first await, and 4 from outside runs right after that. Then the two continuations run in order: 2, then 3.',
  },
  'async-and-then': {
    level: 'mid',
    answer: '1, 2, and 3 run immediately. The continuation after await was queued before the neighboring then, so 4 comes first, then 5.',
  },
  'then-returns-promise': {
    level: 'mid',
    answer: 'The first then prints 1 and returns a promise. The next then waits for the number inside that promise and prints 2.',
  },
  'chain-three': {
    level: 'mid',
    answer: 'Each then passes the string on as its own microtask. The console shows a, then b, then c.',
  },
  'micro-in-micro': {
    level: 'senior',
    answer: '1 prints first. The then that logs 2 is scheduled from inside and joins the tail. 3 was already waiting in the queue, so it runs before 2.',
  },
  'queue-inside-then': {
    level: 'senior',
    answer: 'queueMicrotask works the same way: 1 prints, the callback for 3 was already queued, and the callback for 2 lines up behind it. The console shows 1, 3, 2.',
  },
  'let-timeout': {
    level: 'mid',
    answer: 'Each iteration has its own let. The timers print 0, 1, and 2, each its own number.',
  },
  'var-timeout': {
    level: 'mid',
    answer: 'var is one binding for the whole loop. By the time the timers run, the loop has finished and i is 3, so the console shows 3 three times.',
  },
  loop: {
    level: 'mid',
    answer: 'let remembers its iteration: let 0, let 1, let 2. var is 3 by the end of the loop, so the console shows var 3 three times.',
  },
  'let-promise': {
    level: 'mid',
    answer: 'then behaves like the timer: let keeps the iteration number. The console shows 0, 1, 2.',
  },
  'var-promise': {
    level: 'mid',
    answer: 'var is already 3 by the time the microtasks run. Three thens print the same value: 3, 3, 3.',
  },
  'clear-timeout': {
    level: 'junior',
    answer: 'The timer for no does reach the macrotask queue, and clearTimeout removes it before it runs. Only yes is printed.',
  },
  interval: {
    level: 'junior',
    answer: 'An interval does not schedule every run at once. The next one appears after the previous callback: 1, 2, 3, and the third run stops it.',
  },
  'promise-vs-delays': {
    level: 'mid',
    answer: 'sync runs immediately, and then runs before both timers. Of the timers, the shorter delay runs first: fast, then slow.',
  },
  'nested-async': {
    level: 'senior',
    answer: 'outer and inner run immediately until their awaits, then sync gets a turn. The inner continuation returns before the outer one: inner after, then outer after.',
  },
  'catch-recover': {
    level: 'mid',
    answer: 'catch prints x and returns the plain string ok. The next then receives that string.',
  },
  'throw-in-then': {
    level: 'mid',
    answer: 'A throw inside then rejects that then’s promise. catch receives boom.',
  },
  mixed: {
    level: 'senior',
    answer: '1 and 5 run immediately. Then the microtasks run in the order they were queued: 3, then 4. Timer 2 is last.',
  },
  'big-interview': {
    level: 'senior',
    answer: 'start and end run immediately. Then the microtasks: promise 1, then micro (it was queued before the second then), then promise 2. timeout 1 was there from the start, and timeout 2 was scheduled from the promise, so it is last.',
  },
  'micro-drain': {
    level: 'senior',
    answer: 'Three thens run as a chain, and both timers wait. The console shows micro 1, micro 2, micro 3, and only then macro 1, macro 2.',
  },
  debounce: {
    level: 'mid',
    answer: 'Each call clears the previous timer and logs “waiting”. Only the last argument, c, survives long enough to reach save.',
  },
  throttle: {
    level: 'mid',
    answer: 'a goes through immediately: send a. While the window is closed, b and c are skipped. The timer logs “ready again”, d goes through after that, and the window closes once more.',
  },
  'junior-callback': {
    level: 'junior',
    answer: 'later does not call the callback on the spot. It hands the callback to a timer. First before and after, then callback.',
  },
  'junior-resolve-timeout': {
    level: 'junior',
    answer: 'A, B, and E run immediately: B is printed by the function inside new Promise. C is printed by the timer, and only then does resolve release the then that prints D.',
  },
  'mid-await-yields': {
    level: 'mid',
    answer: 'start, body, and end run immediately: await pauses only run, not the whole script. Then after await, and then the result’s then — returned.',
  },
  'mid-extra-tick': {
    level: 'mid',
    answer: 'The then that logs A returns a promise, so B waits an extra step. The neighboring chain finishes first: A, C, D, and only then B.',
  },
  'mid-sequential-await': {
    level: 'mid',
    answer: 'sync prints immediately, and the second timer is not scheduled yet. First ready a and got a, and only after that b starts: ready b, got b.',
  },
  'mid-finally-then': {
    level: 'mid',
    answer: 'finally prints before then. The value ok continues unchanged: first finally, then ok.',
  },
  'senior-async1': {
    level: 'senior',
    answer: 'Everything before the first await runs immediately: script start, async1 start, async2, promise1, script end. Then the microtasks run in queue order: async1 end, then promise2. setTimeout is last.',
  },
  'senior-timers': {
    level: 'senior',
    answer: 'start and end run immediately, and promise1 runs before the timers. timeout1 and timeout3 were scheduled in the script, timeout2 was scheduled from the promise, so it is last.',
  },
  'senior-finally-reject': {
    level: 'senior',
    answer: 'finally runs on rejection too, before catch. It does not hide the error: catch then prints fail.',
  },
  'staff-checkpoint': {
    level: 'staff',
    answer: 'After timer t1, its microtask runs before the next timer. So the order is t1, t1 micro, and only then t2, t2 micro.',
  },
  'staff-starve': {
    level: 'staff',
    answer: 'The timer has been waiting from the start, and each microtask schedules the next one. macro starts only after the chain 1, 2, 3 has finished.',
  },
  'staff-mix': {
    level: 'staff',
    answer: '1 and 7 run immediately. 3 and 5 are microtasks, in order. 2 and 6 are timers from the script. 4 is scheduled from a microtask, so it is last.',
  },
  'promise-all': {
    level: 'mid',
    answer: 'sync runs immediately. fast settles before slow, and the array is still in list order: [slow, fast].',
  },
  'promise-all-fail': {
    level: 'mid',
    answer: 'One reject rejects the whole Promise.all. The then that would receive the array is skipped, and catch receives no.',
  },
  'promise-race': {
    level: 'mid',
    answer: 'sync prints immediately. Of the two timers, fast wins: its delay is shorter, and slow no longer affects the result.',
  },
  'promise-all-settled': {
    level: 'mid',
    answer: 'The rejection no does not reject the combined promise. The array holds both outcomes: fulfilled with ok, and rejected with no.',
  },
}
