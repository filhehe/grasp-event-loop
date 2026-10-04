export type Level = 'junior' | 'mid' | 'senior' | 'staff'

export const LEVELS = [
  { id: 'all', label: 'Все' },
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid' },
  { id: 'senior', label: 'Senior' },
  { id: 'staff', label: 'Staff' },
] as const

export type LevelFilter = (typeof LEVELS)[number]['id']

export const EXAMPLE_NOTES: Record<string, { level: Level; answer: string }> = {
  'sync-order': {
    level: 'junior',
    answer: 'Три вызова подряд, без таймеров и промисов. В консоли просто 1, потом 2, потом 3.',
  },
  'nested-calls': {
    level: 'junior',
    answer: 'outer сначала печатает себя и только потом зовёт inner. В консоли outer, затем inner.',
  },
  'three-calls': {
    level: 'junior',
    answer: 'Стек растёт вверх: first зовёт second, second зовёт third. Логи идут по пути внутрь: first, second, third.',
  },
  'return-value': {
    level: 'junior',
    answer: 'add(2, 3) считается сразу и возвращает 5 в тот же момент. Очереди нет, в консоли одна строка: 5.',
  },
  'timeout-after-sync': {
    level: 'junior',
    answer: 'start и end печатаются сразу. Таймер, даже с нулём, ждёт конца скрипта: start, end, timeout.',
  },
  'zero-delay': {
    level: 'junior',
    answer: 'Таймер записан раньше console.log, но 0 мс не делает его первым. Сначала sync, потом timer.',
  },
  'two-timeouts': {
    level: 'junior',
    answer: 'Сначала обычный лог, это 3. Два таймера с одной задержкой выходят в том порядке, в каком их записали: 1, затем 2.',
  },
  delays: {
    level: 'junior',
    answer: 'start и end сразу. Дальше таймеры идут по времени, не по строкам в коде: 0ms, потом 50ms, потом 100ms.',
  },
  'promise-executor': {
    level: 'junior',
    answer: 'Функция внутри new Promise выполняется сразу, then здесь нет. Поэтому всё синхронно: 1, потом 2, потом 3.',
  },
  'then-after-sync': {
    level: 'junior',
    answer: '1 и 3 печатаются сразу. 2 сидит в then и дожидается конца скрипта, поэтому она последняя.',
  },
  'two-thens': {
    level: 'junior',
    answer: '3 — обычный лог, он первый. Оба then уже стоят в очереди и идут следом по порядку: 1, потом 2.',
  },
  order: {
    level: 'junior',
    answer: 'start и end сразу. promise — микрозадача, она раньше таймера. В самом конце timeout.',
  },
  micro: {
    level: 'mid',
    answer: 'queueMicrotask записали раньше then, поэтому micro раньше then. Таймер macro самый последний.',
  },
  'micro-vs-then': {
    level: 'mid',
    answer: 'sync печатается сразу. then поставили раньше queueMicrotask, поэтому дальше then, и только потом micro.',
  },
  chain: {
    level: 'mid',
    answer: 'start и end сразу. Потом цепочка: сначала A, then возвращает B, и следующий then печатает уже B.',
  },
  'then-return': {
    level: 'mid',
    answer: 'Первый then получает 1 и печатает его, затем возвращает 2. Следующий then печатает 2. Оба шага — микрозадачи.',
  },
  'two-listeners': {
    level: 'mid',
    answer: '3 печатается сразу. На одном промисе два then, они встают друг за другом: сначала 1, потом 2.',
  },
  classic: {
    level: 'mid',
    answer: '4 печатает функция внутри new Promise, сразу. 2 — это then, он раньше таймеров. Таймеры 1 и 5 стояли в коде по порядку, а 3 поставили уже из then, поэтому он последний.',
  },
  'then-schedules-timeout': {
    level: 'mid',
    answer: '1 и 5 сразу, потом микрозадача 2. Таймер 4 поставили ещё в скрипте, а 3 — уже из then, поэтому 3 последний.',
  },
  'timeout-schedules-then': {
    level: 'mid',
    answer: 'Первый таймер печатает 1 и ставит then. Этот then, строка 2, успевает раньше второго таймера со строкой 3.',
  },
  nested: {
    level: 'mid',
    answer: 'then, который поставили в скрипте, идёт раньше таймера. Внутри таймера свой then печатает inner then сразу после timeout.',
  },
  'micro-schedules-macro': {
    level: 'mid',
    answer: 'Сначала микрозадача micro. Таймер с самого начала печатает macro. later поставили уже из микрозадачи, он самый последний.',
  },
  'nested-timeouts': {
    level: 'mid',
    answer: '1 сразу. Первый таймер печатает 2 и только тогда ставит таймер с 3. Таймер 4 уже стоял в очереди, поэтому он раньше 3.',
  },
  catch: {
    level: 'junior',
    answer: 'sync печатается сразу. reject скрипт не обрывает: catch забирает error уже после скрипта, микрозадачей.',
  },
  finally: {
    level: 'mid',
    answer: 'sync сразу. Потом finally, и следом then получает то же ok: finally здесь ничего не подменяет.',
  },
  'executor-throw': {
    level: 'mid',
    answer: '1 и 2 печатаются сразу: throw внутри new Promise не останавливает скрипт, он только отклоняет промис. catch в коде нет, поэтому отказ остаётся необработанным.',
  },
  'try-catch': {
    level: 'junior',
    answer: 'throw ловится на месте, строка 2 после него не выполняется. В консоли 1, caught и 3.',
  },
  'try-misses-reject': {
    level: 'mid',
    answer: 'try/catch здесь ничего не ловит. 1 и 2 печатаются, caught нет: reject случится позже и останется без обработчика.',
  },
  async: {
    level: 'mid',
    answer: '1, 2 и 3 идут сразу: до await функция не останавливает остальной скрипт. 4 печатается уже после await, поэтому она последняя.',
  },
  'async-without-await': {
    level: 'mid',
    answer: 'await в функции нет, ждать ей нечего. Всё выполняется сразу: 1, 2, 3.',
  },
  'two-awaits': {
    level: 'mid',
    answer: '1 печатается до первого await, и сразу после этого успевает 4 снаружи. Дальше два продолжения по очереди: 2, затем 3.',
  },
  'async-and-then': {
    level: 'mid',
    answer: '1, 2 и 3 сразу. Продолжение после await встало в очередь раньше соседнего then, поэтому сначала 4, потом 5.',
  },
  'then-returns-promise': {
    level: 'mid',
    answer: 'Первый then печатает 1 и возвращает промис. Следующий then ждёт не сам объект, а число внутри, и печатает 2.',
  },
  'chain-three': {
    level: 'mid',
    answer: 'Каждый then передаёт строку дальше отдельной микрозадачей. В консоли a, потом b, потом c.',
  },
  'micro-in-micro': {
    level: 'senior',
    answer: 'Сначала печатается 1. then, который пишет 2, ставится уже внутри и встаёт в хвост. 3 к этому моменту уже ждала в очереди, поэтому она раньше 2.',
  },
  'queue-inside-then': {
    level: 'senior',
    answer: 'С queueMicrotask то же самое: печатается 1, колбэк с 3 уже стоял в очереди, а колбэк с 2 встаёт за ним. В консоли 1, 3, 2.',
  },
  'let-timeout': {
    level: 'mid',
    answer: 'У каждой итерации свой let. Таймеры печатают 0, 1 и 2, а не одно последнее число.',
  },
  'var-timeout': {
    level: 'mid',
    answer: 'var один на весь цикл. К моменту таймеров цикл уже кончился и i равен 3, поэтому три раза 3.',
  },
  loop: {
    level: 'mid',
    answer: 'let помнит свою итерацию: let 0, let 1, let 2. var к концу цикла равен 3, поэтому три раза var 3.',
  },
  'let-promise': {
    level: 'mid',
    answer: 'С then то же, что с таймером: let сохраняет номер итерации. В консоли 0, 1, 2.',
  },
  'var-promise': {
    level: 'mid',
    answer: 'var к моменту микрозадач уже равен 3. Три then печатают одно и то же: 3, 3, 3.',
  },
  'clear-timeout': {
    level: 'junior',
    answer: 'Таймер с no успевает встать в очередь макрозадач, но clearTimeout снимает его до запуска. Печатается только yes.',
  },
  interval: {
    level: 'junior',
    answer: 'Интервал не ставит все запуски сразу. Следующий появляется после предыдущего колбэка: 1, 2, 3, и на тройке его останавливают.',
  },
  'promise-vs-delays': {
    level: 'mid',
    answer: 'sync сразу, then раньше обоих таймеров. Из таймеров раньше тот, у кого меньше задержка: fast, потом slow.',
  },
  'nested-async': {
    level: 'senior',
    answer: 'outer и inner до своих await идут сразу, потом успевает sync. Продолжение inner возвращается раньше продолжения outer: inner after, затем outer after.',
  },
  'catch-recover': {
    level: 'mid',
    answer: 'catch печатает x и возвращает обычную строку ok. Следующий then получает уже её, не ошибку.',
  },
  'throw-in-then': {
    level: 'mid',
    answer: 'throw внутри then отклоняет промис этого then. catch забирает boom.',
  },
  mixed: {
    level: 'senior',
    answer: '1 и 5 сразу. Потом микрозадачи в том порядке, в каком их поставили: 3, затем 4. Таймер 2 последний.',
  },
  'big-interview': {
    level: 'senior',
    answer: 'start и end сразу. Дальше микрозадачи: promise 1, потом micro (его поставили раньше второго then), потом promise 2. timeout 1 стоял с начала, timeout 2 поставили из промиса, поэтому он последний.',
  },
  'micro-drain': {
    level: 'senior',
    answer: 'Три then идут цепочкой, и оба таймера ждут. В консоли micro 1, micro 2, micro 3, и только потом macro 1, macro 2.',
  },
  debounce: {
    level: 'mid',
    answer: 'Каждый вызов сбрасывает предыдущий таймер и пишет «ждем». До save доживает только последний аргумент, c.',
  },
  throttle: {
    level: 'mid',
    answer: 'a проходит сразу: send a. Пока окно закрыто, b и c — мимо. Таймер пишет «снова можно», d после этого проходит, и окно закрывается ещё раз.',
  },
  'junior-callback': {
    level: 'junior',
    answer: 'later не вызывает колбэк на месте, она отдаёт его таймеру. Сначала before и after, потом callback.',
  },
  'junior-resolve-timeout': {
    level: 'junior',
    answer: 'A, B и E сразу: B печатает функция внутри new Promise. C печатает уже таймер, и только тогда resolve пускает then с D.',
  },
  'mid-await-yields': {
    level: 'mid',
    answer: 'start, body и end сразу: await останавливает только run, не весь скрипт. Потом after await, и следом then результата — returned.',
  },
  'mid-extra-tick': {
    level: 'mid',
    answer: 'then с A возвращает промис, и B из-за этого ждёт лишний шаг. Соседняя цепочка успевает целиком: A, C, D, и только потом B.',
  },
  'mid-sequential-await': {
    level: 'mid',
    answer: 'sync печатается сразу, второй таймер ещё не поставлен. Сначала ready a и got a, и только после этого стартует b: ready b, got b.',
  },
  'mid-finally-then': {
    level: 'mid',
    answer: 'finally печатается раньше then. Значение ok доходит дальше без изменений: сначала finally, потом ok.',
  },
  'senior-async1': {
    level: 'senior',
    answer: 'До первого await всё сразу: script start, async1 start, async2, promise1, script end. Потом микрозадачи по порядку постановки: async1 end, затем promise2. setTimeout последний.',
  },
  'senior-timers': {
    level: 'senior',
    answer: 'start и end сразу, promise1 раньше таймеров. timeout1 и timeout3 поставили в скрипте, timeout2 — уже из промиса, поэтому он последний.',
  },
  'senior-finally-reject': {
    level: 'senior',
    answer: 'finally срабатывает и при отказе, раньше catch. Ошибку он не прячет: следом catch печатает fail.',
  },
  'staff-checkpoint': {
    level: 'staff',
    answer: 'После таймера t1 его микрозадача успевает раньше следующего таймера. Поэтому t1, t1 micro, и только потом t2, t2 micro.',
  },
  'staff-starve': {
    level: 'staff',
    answer: 'Таймер стоит с самого начала, но микрозадача каждый раз ставит следующую. Пока цепочка 1, 2, 3 не кончится, macro не начнётся.',
  },
  'staff-mix': {
    level: 'staff',
    answer: '1 и 7 сразу. 3 и 5 — микрозадачи по порядку. 2 и 6 — таймеры из скрипта. 4 ставят уже из микрозадачи, поэтому он последний.',
  },
  'promise-all': {
    level: 'mid',
    answer: 'sync сразу. fast завершается раньше slow, но массив всё равно в порядке списка: [slow, fast].',
  },
  'promise-all-fail': {
    level: 'mid',
    answer: 'Один reject роняет весь Promise.all. then с массивом не вызывается, в catch приходит no.',
  },
  'promise-race': {
    level: 'mid',
    answer: 'sync печатается сразу. Из двух таймеров побеждает fast: он короче, slow на результат уже не влияет.',
  },
  'promise-all-settled': {
    level: 'mid',
    answer: 'Отказ no не роняет общий промис. В массиве оба итога: fulfilled с ok и rejected с no.',
  },
}
