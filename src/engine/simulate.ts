import * as acorn from 'acorn'

export type Zone = 'stack' | 'webapi' | 'macro' | 'micro' | 'console' | 'loop'

export type FrameCard = {
  id: string
  label: string
  line: number
  meta?: string
  start?: number
  end?: number
}

export type ConsoleCard = {
  id: string
  text: string
  kind: 'log' | 'error' | 'info'
}

export type Step = {
  message: string
  line: number | null
  active: Zone | null
  time: number
  callStack: FrameCard[]
  webApis: FrameCard[]
  macrotasks: FrameCard[]
  microtasks: FrameCard[]
  console: ConsoleCard[]
}

export class SyntaxFailure extends Error {
  line: number | null

  constructor(message: string, line: number | null) {
    super(message)
    this.name = 'SyntaxFailure'
    this.line = line
  }
}

type AstNode = {
  type: string
  start: number
  end: number
  loc?: { start: { line: number } }
  [key: string]: unknown
}

type Kind = 'let' | 'const' | 'var' | 'builtin'

type Slot = { value: unknown; kind: Kind }

type FnVal = {
  __type: 'fn'
  name: string
  label: string
  params: string[]
  body: AstNode
  exprBody: boolean
  async: boolean
  env: Env
  line: number
  start: number
  end: number
}

type Builtin = {
  __type: 'builtin'
  name: string
  call: (args: unknown[], line: number) => unknown
}

type PromiseBox = { __type: 'promise'; promise: SimPromise }
type PromiseCtor = { __type: 'promiseCtor' }
type RecordObj = { __type: 'record'; props: Record<string, unknown> }

type Waiter = {
  id: string
  label: string
  line: number
  handlesReject: boolean
  start?: number
  end?: number
  run: (ok: boolean, value: unknown) => void
}

type WebTimer = {
  id: string
  timerId: number
  label: string
  line: number
  meta: string
  delay: number
  expiresAt: number
  kind: 'timeout' | 'interval'
  cb: FnVal
  fires: number
}

type MacroTask = {
  id: string
  label: string
  line: number
  meta?: string
  timerId?: number
  start?: number
  end?: number
  run: () => void
}

type MicroTask = {
  id: string
  label: string
  line: number
  start?: number
  end?: number
  run: () => void
}

class Env {
  parent: Env | null
  vars = new Map<string, Slot>()
  isFunction = false

  constructor(parent: Env | null) {
    this.parent = parent
  }

  define(name: string, value: unknown, kind: Kind) {
    if ((kind === 'let' || kind === 'const') && this.vars.has(name)) {
      throw new Error(`SyntaxError: Identifier '${name}' has already been declared`)
    }
    this.vars.set(name, { value, kind })
  }

  defineVar(name: string, value: unknown) {
    const host = this.functionEnv()
    const existing = host.vars.get(name)
    if (existing) existing.value = value
    else host.vars.set(name, { value, kind: 'var' })
  }

  functionEnv(): Env {
    if (!this.parent || this.isFunction) return this
    return this.parent.functionEnv()
  }

  lookup(name: string): Slot | null {
    const slot = this.vars.get(name)
    if (slot) return slot
    return this.parent ? this.parent.lookup(name) : null
  }

  get(name: string): unknown {
    const slot = this.lookup(name)
    if (!slot) throw new Error(`ReferenceError: ${name} is not defined`)
    return slot.value
  }

  set(name: string, value: unknown) {
    const slot = this.lookup(name)
    if (!slot) throw new Error(`ReferenceError: ${name} is not defined`)
    if (slot.kind === 'const' || slot.kind === 'builtin') {
      throw new Error(`TypeError: Assignment to constant variable '${name}'`)
    }
    slot.value = value
  }

  init(name: string, value: unknown) {
    const slot = this.lookup(name)
    if (!slot) throw new Error(`ReferenceError: ${name} is not defined`)
    slot.value = value
  }
}

class SimPromise {
  state: 'pending' | 'fulfilled' | 'rejected' = 'pending'
  value: unknown
  waiters: Waiter[] = []
  handled = false
  line: number

  constructor(line: number) {
    this.line = line
  }
}

class ReturnSignal {
  value: unknown
  constructor(value: unknown) {
    this.value = value
  }
}
class BreakSignal {}
class ContinueSignal {}
class LimitError extends Error {}

const MAX_STEPS = 500
const MAX_LOOP = 300
const MAX_INTERVAL = 8

function isFn(value: unknown): value is FnVal {
  return Boolean(value && typeof value === 'object' && (value as FnVal).__type === 'fn')
}
function isBuiltin(value: unknown): value is Builtin {
  return Boolean(value && typeof value === 'object' && (value as Builtin).__type === 'builtin')
}
function isPromiseBox(value: unknown): value is PromiseBox {
  return Boolean(value && typeof value === 'object' && (value as PromiseBox).__type === 'promise')
}
function isPromiseCtor(value: unknown): value is PromiseCtor {
  return Boolean(value && typeof value === 'object' && (value as PromiseCtor).__type === 'promiseCtor')
}
function isRecord(value: unknown): value is RecordObj {
  return Boolean(value && typeof value === 'object' && (value as RecordObj).__type === 'record')
}

function list(value: unknown): AstNode[] {
  return Array.isArray(value) ? (value as AstNode[]) : []
}

function lineOf(node: AstNode | undefined): number {
  return node?.loc?.start.line ?? 1
}

function truthy(value: unknown): boolean {
  return Boolean(value)
}

function ru(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100
  const word =
    mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${count} ${word}`
}

export function simulate(code: string): Step[] {
  if (!code.trim()) {
    return [
      {
        message: 'Нечего выполнять',
        line: null,
        active: 'loop',
        time: 0,
        callStack: [],
        webApis: [],
        macrotasks: [],
        microtasks: [],
        console: [],
      },
    ]
  }

  let ast: AstNode
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      locations: true,
      sourceType: 'script',
    }) as unknown as AstNode
  } catch (error) {
    const loc = (error as { loc?: { line?: number } }).loc
    const message = error instanceof Error ? error.message : String(error)
    throw new SyntaxFailure(`Синтаксическая ошибка: ${message}`, loc?.line ?? null)
  }

  const source = code
  const steps: Step[] = []
  const callStack: FrameCard[] = []
  let webApis: WebTimer[] = []
  let macrotasks: MacroTask[] = []
  let microtasks: MicroTask[] = []
  const consoleLines: ConsoleCard[] = []
  const promises: SimPromise[] = []
  let now = 0
  let seq = 0
  let timerSeq = 0
  let entryHint: string | null = null
  const uid = () => `id-${++seq}`

  function snippet(node: AstNode): string {
    const raw = source.slice(node.start, node.end).replace(/\s+/g, ' ').trim()
    if (!raw) return 'anonymous'
    return raw.length > 42 ? `${raw.slice(0, 40)}…` : raw
  }

  function formatValue(value: unknown, seen = new WeakSet<object>()): string {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value)
    if (typeof value === 'boolean') return String(value)
    if (isFn(value)) return value.name ? `[Function ${value.name}]` : '[Function]'
    if (isBuiltin(value)) return `[native ${value.name}]`
    if (isPromiseBox(value)) return 'Promise'
    if (isPromiseCtor(value)) return 'Promise'
    if (typeof value === 'object') {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
      if (value instanceof Error) return value.message
      if (isRecord(value)) return formatValue(value.props, seen)
      if (Array.isArray(value)) return `[${value.map((item) => formatValue(item, seen)).join(', ')}]`
      const entries = Object.entries(value as Record<string, unknown>)
      return `{${entries.map(([key, item]) => `${key}: ${formatValue(item, seen)}`).join(', ')}}`
    }
    return String(value)
  }

  function snapshot(message: string, line: number | null, active: Zone | null) {
    steps.push({
      message,
      line,
      active,
      time: now,
      callStack: callStack.map((frame) => ({ ...frame })),
      webApis: webApis.map((timer) => ({
        id: timer.id,
        label: timer.label,
        line: timer.line,
        meta: timer.meta,
      })),
      macrotasks: macrotasks.map((task) => ({
        id: task.id,
        label: task.label,
        line: task.line,
        meta: task.meta,
        start: task.start,
        end: task.end,
      })),
      microtasks: microtasks.map((task) => ({
        id: task.id,
        label: task.label,
        line: task.line,
        start: task.start,
        end: task.end,
      })),
      console: consoleLines.map((entry) => ({ ...entry })),
    })
    if (steps.length >= MAX_STEPS) {
      const last = steps[steps.length - 1]
      last.message = 'Остановлено: слишком много шагов. Прогон обрезан, чтобы визуализатор не зациклился.'
      last.console = [
        ...last.console,
        { id: uid(), kind: 'info', text: 'Визуализатор остановился: слишком много шагов' },
      ]
      throw new LimitError()
    }
  }

  function takeMicro(label: string) {
    const left = microtasks.length
    const macros = macrotasks.length
    const leftText =
      left === 0
        ? 'Других микрозадач в очереди нет.'
        : left === 1
          ? `Дальше в Microtask Queue ещё одна задача: «${microtasks[0]?.label}». Event Loop возьмёт её следующим шагом, до любой макрозадачи.`
          : `Дальше в Microtask Queue ещё ${ru(left, 'задача', 'задачи', 'задач')}. Следующая — «${microtasks[0]?.label}». Event Loop возьмёт их по одной, до любой макрозадачи.`
    const macroText =
      macros === 0
        ? 'Макрозадач сейчас нет.'
        : `В Macrotask Queue ${ru(macros, 'задача ждёт', 'задачи ждут', 'задач ждут')}. Макрозадачу Event Loop возьмёт только когда микрозадач не останется.`
    return `Event Loop берёт микрозадачу «${label}» и кладёт её в Call Stack. Стек был пуст, поэтому взять задачу можно. ${leftText} ${macroText}`
  }

  function takeMacro(label: string) {
    const left = macrotasks.length
    const leftText =
      left === 0
        ? 'Других макрозадач в очереди нет.'
        : `В Macrotask Queue ещё ${ru(left, 'задача', 'задачи', 'задач')}. За этот проход Event Loop берёт только одну. Следующая — «${macrotasks[0]?.label}».`
    return `Event Loop берёт макрозадачу «${label}» и кладёт её в Call Stack. Микрозадач в очереди нет, поэтому можно взять одну макрозадачу. ${leftText}`
  }

  function reactionMessage(label: string, mode: 'pending' | 'ready' | 'just') {
    if (label === 'Promise.all' || label === 'Promise.race' || label === 'Promise.allSettled') {
      if (mode === 'pending') {
        return `${label} следит за этим промисом. В Microtask Queue пока ничего не добавлено: проверка появится только когда промис завершится.`
      }
      const when =
        mode === 'just'
          ? 'Промис только что завершился.'
          : 'Промис уже был завершён на этой строке.'
      return `${when} Проверка ${label} добавлена в Microtask Queue и выполнится после текущего кода на Call Stack, раньше любой макрозадачи.`
    }
    if (label.startsWith('await ')) {
      const name = label.slice('await '.length)
      if (mode === 'pending') {
        return `Продолжение функции «${name}» пока не в очереди: промис после await ещё не завершился.`
      }
      return `Продолжение функции «${name}» добавлено в Microtask Queue. Промис уже завершён, поэтому «${name}» вернётся на Call Stack после текущего синхронного кода, раньше любой макрозадачи.`
    }
    if (mode === 'pending') {
      return `Колбэк «${label}» пока не в очереди. Промис ещё не завершён, поэтому выполняться этому колбэку нечему. Он попадёт в Microtask Queue в тот шаг, когда промис завершится.`
    }
    const when = mode === 'just' ? 'Промис только что завершился.' : 'Промис уже завершён.'
    return `${when} Колбэк «${label}» добавлен в Microtask Queue. Он выполнится, когда текущий код на Call Stack закончится, и раньше любой макрозадачи.`
  }

  function log(kind: ConsoleCard['kind'], text: string) {
    consoleLines.push({ id: uid(), kind, text })
  }

  function copyEnv(from: Env, parent: Env) {
    const next = new Env(parent)
    for (const [name, slot] of from.vars) next.vars.set(name, { value: slot.value, kind: slot.kind })
    return next
  }

  function makeFunction(node: AstNode, env: Env): FnVal {
    const id = node.id as AstNode | null
    const name = id && id.type === 'Identifier' ? String(id.name) : ''
    return {
      __type: 'fn',
      name,
      label: name || snippet(node),
      params: list(node.params).map((param) => {
        if (param.type !== 'Identifier') throw new Error('Поддерживаются только простые параметры функций')
        return String(param.name)
      }),
      body: node.body as AstNode,
      exprBody: Boolean(node.expression),
      async: Boolean(node.async),
      env,
      line: lineOf(node),
      start: node.start,
      end: node.end,
    }
  }

  function fnSpan(...fns: Array<FnVal | null | undefined>) {
    const present = fns.filter((fn): fn is FnVal => Boolean(fn))
    if (!present.length) return undefined
    return {
      start: Math.min(...present.map((fn) => fn.start)),
      end: Math.max(...present.map((fn) => fn.end)),
    }
  }

  function asFn(value: unknown): FnVal | null {
    if (value == null) return null
    if (isFn(value)) return value
    throw new Error('Ожидалась функция')
  }

  function createPromise(line: number) {
    const promise = new SimPromise(line)
    promises.push(promise)
    return promise
  }

  function flushWaiters(promise: SimPromise, ok: boolean) {
    const waiters = promise.waiters.splice(0)
    if (!ok && waiters.some((waiter) => waiter.handlesReject)) promise.handled = true
    for (const waiter of waiters) {
      const settled = ok
      const payload = promise.value
      microtasks.push({
        id: waiter.id,
        label: waiter.label,
        line: waiter.line,
        start: waiter.start,
        end: waiter.end,
        run: () => waiter.run(settled, payload),
      })
    }
    if (waiters.length) {
      const message =
        waiters.length === 1
          ? reactionMessage(waiters[0].label, 'just')
          : `Промис только что завершился. В Microtask Queue добавлены ${ru(waiters.length, 'колбэк', 'колбэка', 'колбэков')}, по порядку. Они выполнятся один за другим, когда текущий код на Call Stack закончится, и раньше любой макрозадачи.`
      snapshot(message, waiters[0].line, 'micro')
    }
  }

  function fulfill(promise: SimPromise, value: unknown) {
    if (promise.state !== 'pending') return
    if (isPromiseBox(value)) {
      if (value.promise === promise) {
        reject(promise, new TypeError('Chaining cycle detected for promise'))
        return
      }
      enqueueReaction(value.promise, 'resolve', promise.line, true, (ok, inner) => {
        if (ok) fulfill(promise, inner)
        else reject(promise, inner)
      })
      return
    }
    promise.state = 'fulfilled'
    promise.value = value
    flushWaiters(promise, true)
  }

  function reject(promise: SimPromise, reason: unknown) {
    if (promise.state !== 'pending') return
    promise.state = 'rejected'
    promise.value = reason
    flushWaiters(promise, false)
  }

  function enqueueReaction(
    promise: SimPromise,
    label: string,
    line: number,
    handlesReject: boolean,
    run: (ok: boolean, value: unknown) => void,
    span?: { start: number; end: number },
  ) {
    if (handlesReject) promise.handled = true
    const waiter: Waiter = { id: uid(), label, line, handlesReject, start: span?.start, end: span?.end, run }
    if (promise.state === 'pending') {
      promise.waiters.push(waiter)
      snapshot(reactionMessage(label, 'pending'), line, null)
      return
    }
    microtasks.push({
      id: waiter.id,
      label,
      line,
      start: span?.start,
      end: span?.end,
      run: () => run(promise.state === 'fulfilled', promise.value),
    })
    snapshot(reactionMessage(label, 'ready'), line, 'micro')
  }

  function promiseThen(promise: SimPromise, onFulfilled: unknown, onRejected: unknown, line: number) {
    const fulfilledFn = asFn(onFulfilled)
    const rejectedFn = asFn(onRejected)
    const next = createPromise(line)
    const label = fulfilledFn?.label ?? rejectedFn?.label ?? 'then'
    enqueueReaction(promise, label, line, true, (ok, value) => {
      const handler = ok ? fulfilledFn : rejectedFn
      if (!handler) {
        if (ok) fulfill(next, value)
        else reject(next, value)
        return
      }
      try {
        entryHint = takeMicro(handler.label)
        fulfill(next, invoke(handler, [value], handler.line))
      } catch (error) {
        if (error instanceof LimitError) throw error
        reject(next, error)
      }
    }, fnSpan(fulfilledFn, rejectedFn))
    return { __type: 'promise', promise: next } satisfies PromiseBox
  }

  function bind(fn: FnVal, args: unknown[], env: Env) {
    fn.params.forEach((name, index) => env.define(name, args[index], 'let'))
  }

  function invoke(value: unknown, args: unknown[], line: number): unknown {
    if (isBuiltin(value)) {
      const depth = callStack.length
      callStack.push({ id: uid(), label: value.name, line })
      try {
        const result = value.call(args, line)
        callStack.pop()
        return result
      } catch (error) {
        callStack.splice(depth)
        throw error
      }
    }
    if (!isFn(value)) throw new Error(`${formatValue(value)} is not a function`)

    const hint = entryHint
    entryHint = null
    const depth = callStack.length
    const active: Zone | null = hint ? 'loop' : 'stack'
    if (!hint && line !== value.line) {
      snapshot(
        `Вызов функции «${value.label}». Подсвечена строка, откуда её вызывают. На Call Stack её ещё нет: рамка появится на следующем шаге, когда выполнение зайдёт внутрь.`,
        line,
        'stack',
      )
    }
    callStack.push({ id: uid(), label: value.label, line: value.line })
    try {
      if (value.async) {
        snapshot(
          hint ??
            (value.async
              ? `Функция «${value.label}» попадает сразу в Call Stack. Это async-функция: до первого await она идёт синхронно, как обычная. Пока Call Stack не станет пустым, Event Loop не будет брать задачи из очередей.`
              : `Функция «${value.label}» попадает сразу в Call Stack и выполняется сверху вниз, со своей первой строки. Пока Call Stack не станет пустым, Event Loop не будет брать задачи из очередей.`),
          value.line,
          active,
        )
        const result = createPromise(value.line)
        const fnEnv = new Env(value.env)
        fnEnv.isFunction = true
        bind(value, args, fnEnv)
        try {
          const suspended = runAsync(value, fnEnv, result, 0)
          if (!suspended) callStack.pop()
        } catch (error) {
          if (error instanceof LimitError) throw error
          if (callStack.at(-1)?.label === value.label) callStack.pop()
          reject(result, error)
        }
        return { __type: 'promise', promise: result } satisfies PromiseBox
      }

      snapshot(
        hint ??
          `Функция «${value.label}» попадает сразу в Call Stack и выполняется сверху вниз, со своей первой строки. Пока Call Stack не станет пустым, Event Loop не будет брать задачи из очередей.`,
        value.line,
        active,
      )
      const fnEnv = new Env(value.env)
      fnEnv.isFunction = true
      bind(value, args, fnEnv)
      let returned: unknown
      try {
        returned = value.exprBody ? evalExpr(value.body, fnEnv) : execBlock(value.body, fnEnv)
      } catch (error) {
        if (error instanceof ReturnSignal) returned = error.value
        else throw error
      }
      callStack.pop()
      return returned
    } catch (error) {
      callStack.splice(depth)
      throw error
    }
  }

  function hasAwait(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false
    const record = node as AstNode
    if (record.type === 'AwaitExpression') return true
    for (const key of Object.keys(record)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue
      const child = record[key]
      if (Array.isArray(child)) {
        if (child.some((item) => hasAwait(item))) return true
      } else if (hasAwait(child)) return true
    }
    return false
  }

  type AwaitSpec = (
    | { kind: 'bare'; expr: AstNode }
    | { kind: 'return'; expr: AstNode }
    | { kind: 'decl'; expr: AstNode; name: string; declKind: Kind }
    | { kind: 'assign'; expr: AstNode; name: string }
  ) & { start: number; end: number }

  function parseAwait(stmt: AstNode): AwaitSpec {
    const fail = () => {
      throw new Error('await поддерживается как: await expr, const x = await expr, return await expr')
    }
    if (stmt.type === 'ExpressionStatement') {
      const expr = stmt.expression as AstNode
      if (expr.type === 'AwaitExpression' && !hasAwait(expr.argument)) {
        return { kind: 'bare', expr: expr.argument as AstNode, start: stmt.start, end: stmt.end }
      }
      if (
        expr.type === 'AssignmentExpression' &&
        expr.operator === '=' &&
        (expr.left as AstNode).type === 'Identifier' &&
        (expr.right as AstNode).type === 'AwaitExpression' &&
        !hasAwait((expr.right as AstNode).argument)
      ) {
        return {
          kind: 'assign',
          name: String((expr.left as AstNode).name),
          expr: (expr.right as AstNode).argument as AstNode,
          start: stmt.start,
          end: stmt.end,
        }
      }
    }
    if (stmt.type === 'VariableDeclaration' && list(stmt.declarations).length === 1) {
      const decl = list(stmt.declarations)[0]
      const init = decl.init as AstNode | null
      if (
        decl.id &&
        (decl.id as AstNode).type === 'Identifier' &&
        init?.type === 'AwaitExpression' &&
        !hasAwait(init.argument)
      ) {
        const kind = stmt.kind === 'const' || stmt.kind === 'var' ? (stmt.kind as Kind) : 'let'
        return {
          kind: 'decl',
          name: String((decl.id as AstNode).name),
          expr: init.argument as AstNode,
          declKind: kind,
          start: stmt.start,
          end: stmt.end,
        }
      }
    }
    if (stmt.type === 'ReturnStatement' && (stmt.argument as AstNode | null)?.type === 'AwaitExpression') {
      const argument = stmt.argument as AstNode
      if (!hasAwait(argument.argument)) {
        return { kind: 'return', expr: argument.argument as AstNode, start: stmt.start, end: stmt.end }
      }
    }
    fail()
    throw new Error('await')
  }

  function toPromise(value: unknown, line: number): SimPromise {
    if (isPromiseBox(value)) return value.promise
    const promise = createPromise(line)
    fulfill(promise, value)
    return promise
  }

  function runAsync(fn: FnVal, env: Env, result: SimPromise, start: number): boolean {
    if (fn.exprBody) {
      if (hasAwait(fn.body)) {
        if (fn.body.type !== 'AwaitExpression') {
          throw new Error('В стрелочной async-функции await поддерживается только как await expr')
        }
        return suspend(fn, env, result, 0, { kind: 'return', expr: fn.body.argument as AstNode, start: fn.body.start, end: fn.body.end }, true)
      }
      fulfill(result, evalExpr(fn.body, env))
      return false
    }

    const stmts = list(fn.body.body)
    if (start === 0) hoist(stmts, env)
    for (let index = start; index < stmts.length; index += 1) {
      const stmt = stmts[index]
      if (stmt.type === 'FunctionDeclaration') continue
      if (!hasAwait(stmt)) {
        try {
          execStmt(stmt, env)
        } catch (error) {
          if (error instanceof ReturnSignal) {
            fulfill(result, error.value)
            return false
          }
          throw error
        }
        continue
      }
      return suspend(fn, env, result, index, parseAwait(stmt), false)
    }
    fulfill(result, undefined)
    return false
  }

  function suspend(fn: FnVal, env: Env, result: SimPromise, index: number, spec: AwaitSpec, exprBody: boolean): boolean {
    const line = fn.line
    const awaited = toPromise(evalExpr(spec.expr, env), line)
    callStack.pop()
    snapshot(
      `await внутри «${fn.label}» ставит функцию на паузу и снимает её с Call Stack. Строки после await не выполнятся, пока промис не завершится. Продолжение вернётся микрозадачей, не продолжением текущего кода.`,
      line,
      'stack',
    )
    enqueueReaction(awaited, `await ${fn.label}`, line, true, (ok, value) => {
      if (!ok) {
        reject(result, value)
        return
      }
      callStack.push({ id: uid(), label: fn.label, line: fn.line })
      snapshot(
        `await завершился — функция «${fn.label}» снова в Call Stack. Промис уже готов, поэтому продолжение пришло микрозадачей и идёт раньше следующих макрозадач.`,
        fn.line,
        'loop',
      )
      try {
        if (spec.kind === 'decl') {
          if (spec.declKind === 'var') env.defineVar(spec.name, value)
          else {
            env.define(spec.name, undefined, spec.declKind)
            env.init(spec.name, value)
          }
        } else if (spec.kind === 'assign') env.set(spec.name, value)
        if (spec.kind === 'return' || exprBody) {
          fulfill(result, value)
          callStack.pop()
          return
        }
        const again = runAsync(fn, env, result, index + 1)
        if (!again) callStack.pop()
      } catch (error) {
        if (callStack.at(-1)?.label === fn.label) callStack.pop()
        if (error instanceof LimitError) throw error
        reject(result, error)
      }
    }, { start: spec.start, end: spec.end })
    return true
  }

  function evalArgs(nodes: unknown, env: Env): unknown[] {
    return list(nodes).map((node) => {
      if (node.type === 'SpreadElement') throw new Error('spread не поддерживается')
      return evalExpr(node, env)
    })
  }

  function evalExpr(node: AstNode, env: Env): unknown {
    switch (node.type) {
      case 'Literal':
        if (node.regex) throw new Error('Регулярные выражения не поддерживаются')
        if (node.bigint != null) throw new Error('BigInt не поддерживается')
        return node.value
      case 'Identifier':
        return env.get(String(node.name))
      case 'UnaryExpression':
        return evalUnary(node, env)
      case 'BinaryExpression':
        return applyBinary(String(node.operator), evalExpr(node.left as AstNode, env), evalExpr(node.right as AstNode, env))
      case 'LogicalExpression':
        return evalLogical(node, env)
      case 'ConditionalExpression':
        return truthy(evalExpr(node.test as AstNode, env))
          ? evalExpr(node.consequent as AstNode, env)
          : evalExpr(node.alternate as AstNode, env)
      case 'AssignmentExpression':
        return evalAssign(node, env)
      case 'UpdateExpression':
        return evalUpdate(node, env)
      case 'ArrayExpression':
        return list(node.elements).map((element) => {
          if (!element) return undefined
          if (element.type === 'SpreadElement') throw new Error('spread не поддерживается')
          return evalExpr(element, env)
        })
      case 'ObjectExpression':
        return evalObject(node, env)
      case 'TemplateLiteral':
        return evalTemplate(node, env)
      case 'MemberExpression':
        return evalMember(node, env)
      case 'ChainExpression':
        return evalExpr(node.expression as AstNode, env)
      case 'CallExpression':
        return evalCall(node, env)
      case 'NewExpression':
        return evalNew(node, env)
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return makeFunction(node, env)
      case 'SequenceExpression': {
        let value: unknown
        for (const expr of list(node.expressions)) value = evalExpr(expr, env)
        return value
      }
      case 'AwaitExpression':
        throw new Error('await стоит в неподдерживаемой позиции')
      case 'ThisExpression':
        throw new Error('this не поддерживается')
      default:
        throw new Error(`Синтаксис ${node.type} не поддерживается`)
    }
  }

  function evalUnary(node: AstNode, env: Env): unknown {
    if (node.operator === 'typeof') {
      try {
        const target = evalExpr(node.argument as AstNode, env)
        if (target === null) return 'object'
        if (isFn(target) || isBuiltin(target)) return 'function'
        return typeof target
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('ReferenceError') && (node.argument as AstNode).type === 'Identifier') {
          return 'undefined'
        }
        throw error
      }
    }
    const value = evalExpr(node.argument as AstNode, env)
    switch (node.operator) {
      case '!':
        return !truthy(value)
      case '+':
        return Number(value)
      case '-':
        return -Number(value)
      case '~':
        return ~Number(value)
      case 'void':
        return undefined
      default:
        throw new Error(`Оператор ${String(node.operator)} не поддерживается`)
    }
  }

  function jsAdd(left: unknown, right: unknown): unknown {
    if (typeof left === 'string' || typeof right === 'string') return String(left) + String(right)
    return Number(left) + Number(right)
  }

  function applyBinary(op: string, left: unknown, right: unknown): unknown {
    switch (op) {
      case '+':
        return jsAdd(left, right)
      case '-':
        return Number(left) - Number(right)
      case '*':
        return Number(left) * Number(right)
      case '/':
        return Number(left) / Number(right)
      case '%':
        return Number(left) % Number(right)
      case '===':
        return left === right
      case '!==':
        return left !== right
      case '==':
        return looseEqual(left, right)
      case '!=':
        return !looseEqual(left, right)
      case '<':
        return Number(left) < Number(right) || (typeof left === 'string' && typeof right === 'string' && left < right)
      case '>':
        return Number(left) > Number(right) || (typeof left === 'string' && typeof right === 'string' && left > right)
      case '<=':
        return Boolean(applyBinary('<', left, right)) || left === right
      case '>=':
        return Boolean(applyBinary('>', left, right)) || left === right
      default:
        throw new Error(`Оператор ${op} не поддерживается`)
    }
  }

  function looseEqual(left: unknown, right: unknown): boolean {
    if (typeof left === typeof right) return left === right
    if (left == null && right == null) return true
    if (typeof left === 'number' || typeof right === 'number' || typeof left === 'boolean' || typeof right === 'boolean') {
      return Number(left) === Number(right)
    }
    return String(left) === String(right)
  }

  function evalLogical(node: AstNode, env: Env): unknown {
    const left = evalExpr(node.left as AstNode, env)
    if (node.operator === '&&') return truthy(left) ? evalExpr(node.right as AstNode, env) : left
    if (node.operator === '||') return truthy(left) ? left : evalExpr(node.right as AstNode, env)
    if (node.operator === '??') return left == null ? evalExpr(node.right as AstNode, env) : left
    throw new Error(`Оператор ${String(node.operator)} не поддерживается`)
  }

  function evalAssign(node: AstNode, env: Env): unknown {
    if ((node.left as AstNode).type !== 'Identifier') throw new Error('Поддерживается только присваивание переменной')
    const name = String((node.left as AstNode).name)
    const right = evalExpr(node.right as AstNode, env)
    const op = String(node.operator)
    if (op === '=') {
      env.set(name, right)
      return right
    }
    const current = env.get(name)
    let next: unknown
    if (op === '+=') next = jsAdd(current, right)
    else if (op === '-=') next = Number(current) - Number(right)
    else if (op === '*=') next = Number(current) * Number(right)
    else if (op === '/=') next = Number(current) / Number(right)
    else if (op === '%=') next = Number(current) % Number(right)
    else throw new Error(`Оператор ${op} не поддерживается`)
    env.set(name, next)
    return next
  }

  function evalUpdate(node: AstNode, env: Env): unknown {
    if ((node.argument as AstNode).type !== 'Identifier') throw new Error('++ и -- поддерживаются только для переменных')
    const name = String((node.argument as AstNode).name)
    const current = Number(env.get(name))
    const next = node.operator === '++' ? current + 1 : current - 1
    env.set(name, next)
    return node.prefix ? next : current
  }

  function evalObject(node: AstNode, env: Env): Record<string, unknown> {
    const object: Record<string, unknown> = {}
    for (const prop of list(node.properties)) {
      if (prop.type === 'SpreadElement') throw new Error('spread не поддерживается')
      if (prop.kind === 'get' || prop.kind === 'set') throw new Error('Геттеры и сеттеры не поддерживаются')
      const keyNode = prop.key as AstNode
      const key = prop.computed
        ? String(evalExpr(keyNode, env))
        : keyNode.type === 'Identifier'
          ? String(keyNode.name)
          : String((keyNode as AstNode).value)
      const valueNode = prop.value as AstNode
      object[key] = prop.method ? makeFunction(valueNode, env) : evalExpr(valueNode, env)
    }
    return object
  }

  function evalTemplate(node: AstNode, env: Env): string {
    const quasis = list(node.quasis)
    const exprs = list(node.expressions)
    let text = ''
    quasis.forEach((quasi, index) => {
      text += String((quasi.value as { cooked?: string }).cooked ?? '')
      if (index < exprs.length) text += formatValue(evalExpr(exprs[index], env))
    })
    return text
  }

  function evalMember(node: AstNode, env: Env): unknown {
    const object = evalExpr(node.object as AstNode, env)
    if (node.optional && (object == null)) return undefined
    const key = node.computed
      ? String(evalExpr(node.property as AstNode, env))
      : String((node.property as AstNode).name)
    if (object == null) throw new Error(`Нельзя прочитать свойство ${key}`)
    if (isRecord(object)) {
      if (!(key in object.props)) throw new Error(`У объекта нет свойства ${key}`)
      return object.props[key]
    }
    if (isPromiseBox(object)) {
      if (key === 'then') return builtin('.then', (args, line) => promiseThen(object.promise, args[0], args[1], line))
      if (key === 'catch') return builtin('.catch', (args, line) => promiseThen(object.promise, null, args[0], line))
      if (key === 'finally') return builtin('.finally', (args, line) => promiseFinally(object.promise, args[0], line))
      throw new Error(`У промиса нет свойства ${key}`)
    }
    if (isPromiseCtor(object)) {
      if (key === 'resolve') return builtin('Promise.resolve', (args, line) => promiseResolve(args[0], line))
      if (key === 'reject') return builtin('Promise.reject', (args, line) => promiseReject(args[0], line))
      if (key === 'all') return builtin('Promise.all', (args, line) => promiseAll(args[0], line))
      if (key === 'race') return builtin('Promise.race', (args, line) => promiseRace(args[0], line))
      if (key === 'allSettled') return builtin('Promise.allSettled', (args, line) => promiseAllSettled(args[0], line))
      throw new Error(`У Promise нет свойства ${key}`)
    }
    if (typeof object === 'object') return (object as Record<string, unknown>)[key]
    throw new Error(`Нельзя прочитать свойство ${key}`)
  }

  function callLine(node: AstNode): number {
    if ((node.callee as AstNode | undefined)?.type === 'MemberExpression') {
      return lineOf(((node.callee as AstNode).property as AstNode) ?? node)
    }
    return lineOf(node)
  }

  function evalCall(node: AstNode, env: Env): unknown {
    const callee = evalExpr(node.callee as AstNode, env)
    if (node.optional && callee == null) return undefined
    return invoke(callee, evalArgs(node.arguments, env), callLine(node))
  }

  function evalNew(node: AstNode, env: Env): unknown {
    const callee = evalExpr(node.callee as AstNode, env)
    const args = evalArgs(node.arguments, env)
    if (!isPromiseCtor(callee)) throw new Error('new поддерживается только для Promise')
    return constructPromise(args, lineOf(node))
  }

  function builtin(name: string, call: (args: unknown[], line: number) => unknown): Builtin {
    return { __type: 'builtin', name, call }
  }

  function promiseResolve(value: unknown, line: number, via?: 'Promise.all' | 'Promise.race' | 'Promise.allSettled'): PromiseBox {
    if (isPromiseBox(value)) {
      snapshot(
        via
          ? `${via} берёт промис из списка как есть. Новый промис для этого элемента не создаётся: ${via} просто ждёт, когда завершится этот.`
          : 'Promise.resolve получает уже существующий промис и возвращает его же. Новый промис не создаётся.',
        line,
        'stack',
      )
      return value
    }
    const promise = createPromise(line)
    fulfill(promise, value)
    snapshot(
      via
        ? `${via} оборачивает значение в промис, который уже выполнен. Общий результат по правилам ${via} на этой строке ещё не готов.`
        : 'Promise.resolve создаёт промис, который уже выполнен. Если на этой строке следом есть then, его колбэк не запустится сейчас: он встанет в Microtask Queue.',
      line,
      'stack',
    )
    return { __type: 'promise', promise }
  }

  function promiseReject(reason: unknown, line: number): PromiseBox {
    const promise = createPromise(line)
    reject(promise, reason)
    snapshot(
      'Promise.reject создаёт промис, который уже отклонён. Эта строка скрипт не прерывает. Если дальше есть catch или then с обработчиком ошибки, он получит её микрозадачей. Если обработчика нет, отказ попадёт в консоль в конце прогона.',
      line,
      'stack',
    )
    return { __type: 'promise', promise }
  }

  function promiseList(value: unknown): unknown[] | null {
    if (Array.isArray(value)) return value
    return null
  }

  function promiseAll(value: unknown, line: number): PromiseBox {
    const items = promiseList(value)
    const result = createPromise(line)
    if (!items) {
      reject(result, 'Promise.all ожидает массив')
      snapshot('Promise.all отклонён: аргумент не массив. Исключение в код не выбрасывается, возвращается отклонённый промис.', line, 'stack')
      return { __type: 'promise', promise: result }
    }
    if (items.length === 0) {
      fulfill(result, [])
      snapshot('Promise.all сразу завершается: список пуст, результат — []. Если дальше есть then, его колбэк не выполнится на этой строке, а встанет в Microtask Queue.', line, 'stack')
      return { __type: 'promise', promise: result }
    }
    const values = new Array<unknown>(items.length)
    let remaining = items.length
    let settled = false
    snapshot(
      `Promise.all ждёт ${ru(items.length, 'промис', 'промиса', 'промисов')}. В then придёт один массив в том же порядке, что и в списке, даже если промисы завершатся в другом порядке. Один отказ отклонит весь Promise.all.`,
      line,
      'stack',
    )
    items.forEach((item, index) => {
      const box = promiseResolve(item, line, 'Promise.all')
      enqueueReaction(box.promise, 'Promise.all', line, true, (ok, payload) => {
        if (settled) return
        if (!ok) {
          settled = true
          reject(result, payload)
          return
        }
        values[index] = payload
        remaining -= 1
        if (remaining === 0) {
          settled = true
          fulfill(result, values)
        }
      })
    })
    return { __type: 'promise', promise: result }
  }

  function promiseRace(value: unknown, line: number): PromiseBox {
    const items = promiseList(value)
    const result = createPromise(line)
    if (!items) {
      reject(result, 'Promise.race ожидает массив')
      snapshot('Promise.race отклонён: аргумент не массив. Исключение в код не выбрасывается, возвращается отклонённый промис.', line, 'stack')
      return { __type: 'promise', promise: result }
    }
    if (items.length === 0) {
      snapshot('Promise.race получил пустой список и остаётся в ожидании навсегда: завершать его нечему.', line, 'stack')
      return { __type: 'promise', promise: result }
    }
    let settled = false
    snapshot(
      `Promise.race ждёт ${ru(items.length, 'промис', 'промиса', 'промисов')}. В then или catch попадёт результат того, кто завершится первым. Остальные на итог уже не влияют.`,
      line,
      'stack',
    )
    for (const item of items) {
      const box = promiseResolve(item, line, 'Promise.race')
      enqueueReaction(box.promise, 'Promise.race', line, true, (ok, payload) => {
        if (settled) return
        settled = true
        if (ok) fulfill(result, payload)
        else reject(result, payload)
      })
    }
    return { __type: 'promise', promise: result }
  }

  function promiseAllSettled(value: unknown, line: number): PromiseBox {
    const items = promiseList(value)
    const result = createPromise(line)
    if (!items) {
      reject(result, 'Promise.allSettled ожидает массив')
      snapshot('Promise.allSettled отклонён: аргумент не массив. Исключение в код не выбрасывается, возвращается отклонённый промис.', line, 'stack')
      return { __type: 'promise', promise: result }
    }
    if (items.length === 0) {
      fulfill(result, [])
      snapshot('Promise.allSettled сразу завершается: список пуст, результат — []. Если дальше есть then, его колбэк встанет в Microtask Queue.', line, 'stack')
      return { __type: 'promise', promise: result }
    }
    const values = new Array<unknown>(items.length)
    let remaining = items.length
    snapshot(
      `Promise.allSettled ждёт ${ru(items.length, 'промис', 'промиса', 'промисов')}. Отказ одного промиса общий результат не отклоняет. В then придёт массив: у каждого элемента статус fulfilled или rejected.`,
      line,
      'stack',
    )
    items.forEach((item, index) => {
      const box = promiseResolve(item, line, 'Promise.allSettled')
      enqueueReaction(box.promise, 'Promise.allSettled', line, true, (ok, payload) => {
        values[index] = ok ? { status: 'fulfilled', value: payload } : { status: 'rejected', reason: payload }
        remaining -= 1
        if (remaining === 0) fulfill(result, values)
      })
    })
    return { __type: 'promise', promise: result }
  }

  function promiseFinally(promise: SimPromise, handler: unknown, line: number): PromiseBox {
    const fn = asFn(handler)
    const next = createPromise(line)
    enqueueReaction(promise, fn?.label ?? 'finally', line, true, (ok, value) => {
      try {
        if (fn) invoke(fn, [], fn.line)
        if (ok) fulfill(next, value)
        else reject(next, value)
      } catch (error) {
        if (error instanceof LimitError) throw error
        reject(next, error)
      }
    }, fn ? { start: fn.start, end: fn.end } : undefined)
    return { __type: 'promise', promise: next }
  }

  function constructPromise(args: unknown[], line: number): PromiseBox {
    const executor = asFn(args[0])
    if (!executor) throw new Error('Promise executor должен быть функцией')
    const promise = createPromise(line)
    const resolve = builtin('resolve', (values) => {
      fulfill(promise, values[0])
      return undefined
    })
    const rejectFn = builtin('reject', (values) => {
      reject(promise, values[0])
      return undefined
    })
    try {
      invoke(executor, [resolve, rejectFn], executor.line)
    } catch (error) {
      if (error instanceof LimitError) throw error
      if (promise.state === 'pending') {
        const message = error instanceof Error ? error.message : String(error)
        log('error', message)
        snapshot(
          'Функция внутри new Promise бросила ошибку, и промис отклонён. Строки скрипта после new Promise продолжают выполняться: ошибка наружу не вылетает, она остаётся внутри промиса.',
          line,
          'console',
        )
        reject(promise, error)
      }
    }
    return { __type: 'promise', promise }
  }

  function readDelay(value: unknown): number {
    if (value == null) return 0
    const delay = Number(value)
    if (!Number.isFinite(delay)) return 0
    return Math.max(0, Math.min(60_000, delay))
  }

  function enqueueCallback(timer: WebTimer) {
    macrotasks.push({
      id: uid(),
      label: timer.label,
      line: timer.line,
      start: timer.cb.start,
      end: timer.cb.end,
      meta: timer.kind === 'interval' ? 'interval' : undefined,
      timerId: timer.timerId,
      run() {
        entryHint = takeMacro(timer.label)
        invoke(timer.cb, [], timer.cb.line)
        if (timer.kind === 'interval') afterInterval(timer)
      },
    })
  }

  function afterInterval(timer: WebTimer) {
    if (!webApis.some((item) => item.id === timer.id)) return
    timer.fires += 1
    if (timer.fires >= MAX_INTERVAL) {
      webApis = webApis.filter((item) => item.id !== timer.id)
      log('info', `setInterval остановлен после ${MAX_INTERVAL} срабатываний`)
      snapshot(
        `setInterval остановлен после ${MAX_INTERVAL} срабатываний. В визуализаторе у интервала есть этот предел, чтобы пример не шёл бесконечно. Новые повторы больше не планируются.`,
        timer.line,
        'console',
      )
      return
    }
    if (timer.delay === 0) {
      enqueueCallback(timer)
      snapshot(
        `Предыдущий колбэк setInterval отработал. Следующий запуск «${timer.label}» поставлен в Macrotask Queue. Повтор появляется только после прошлого колбэка, а не все запуски сразу.`,
        timer.line,
        'macro',
      )
      return
    }
    timer.expiresAt = now + timer.delay
  }

  function scheduleTimer(args: unknown[], line: number, kind: 'timeout' | 'interval') {
    const callback = asFn(args[0])
    if (!callback) throw new Error(`${kind === 'timeout' ? 'setTimeout' : 'setInterval'} ожидает функцию`)
    const delay = readDelay(args[1])
    const timerId = ++timerSeq
    const timer: WebTimer = {
      id: uid(),
      timerId,
      label: callback.label,
      line: callback.line,
      meta: `#${timerId} · ${delay}ms`,
      delay,
      expiresAt: now + delay,
      kind,
      cb: callback,
      fires: 0,
    }
    webApis.push(timer)
    snapshot(
      kind === 'timeout'
        ? `setTimeout не вызывает «${callback.label}» сейчас. На Call Stack сверху лежит setTimeout, а сам колбэк записан в Web API и ждёт ${delay} мс виртуального времени.`
        : `setInterval не вызывает «${callback.label}» сейчас. На Call Stack сверху лежит setInterval, а сам колбэк записан в Web API. Повтор будет каждые ${delay} мс виртуального времени, и только после того, как прошлый колбэк отработает.`,
      line,
      'webapi',
    )
    if (delay === 0) {
      if (kind === 'interval') timer.expiresAt = Number.POSITIVE_INFINITY
      else webApis = webApis.filter((item) => item.id !== timer.id)
      enqueueCallback(timer)
      snapshot(
        `Задержка 0 мс не запускает «${callback.label}» сразу. Колбэк уходит из Web API в Macrotask Queue. Он выполнится только когда текущий код закончится, Call Stack опустеет и микрозадач не останется.`,
        line,
        'macro',
      )
    }
    return timerId
  }

  function cancelTimer(id: number) {
    const found =
      webApis.find((timer) => timer.timerId === id) ?? macrotasks.find((task) => task.timerId === id)
    const before = webApis.length + macrotasks.length
    webApis = webApis.filter((timer) => timer.timerId !== id)
    macrotasks = macrotasks.filter((task) => task.timerId !== id)
    return { removed: before !== webApis.length + macrotasks.length, label: found?.label }
  }

  function promoteDue() {
    const due = webApis.filter((timer) => timer.expiresAt <= now).sort((a, b) => a.timerId - b.timerId)
    if (!due.length) return false
    for (const timer of due) {
      if (timer.kind === 'timeout') webApis = webApis.filter((item) => item.id !== timer.id)
      else timer.expiresAt = Number.POSITIVE_INFINITY
      enqueueCallback(timer)
    }
    const names = due.map((timer) => `«${timer.label}»`).join(', ')
    const message =
      due.length === 1
        ? `Задержка вышла. Колбэк ${names} переходит из Web API в Macrotask Queue. Сейчас он не выполняется: его заберёт Event Loop, когда Call Stack будет пуст и микрозадач не останется.`
        : `Задержка вышла у колбэков ${names}. Они переходят из Web API в Macrotask Queue и ждут там по одному. Сейчас ни один из них не выполняется.`
    snapshot(message, due[0].line, 'macro')
    return true
  }

  function writeConsole(kind: ConsoleCard['kind'], args: unknown[], line: number, name = kind) {
    const text = args.map((arg) => formatValue(arg)).join(' ')
    log(kind, text)
    const printed = text ? `«${text}»` : 'пустую строку'
    snapshot(
      `console.${name} печатает ${printed} сразу, на этой строке. Это синхронный вызов: в Microtask Queue и Macrotask Queue он не встаёт. На Call Stack в этом шаге сверху лежит console.${name}, после печати эта рамка снимется.`,
      line,
      'console',
    )
  }

  function registerGlobals(env: Env) {
    const consoleObj: RecordObj = {
      __type: 'record',
      props: {
        log: builtin('console.log', (args, line) => writeConsole('log', args, line)),
        info: builtin('console.info', (args, line) => writeConsole('info', args, line)),
        warn: builtin('console.warn', (args, line) => writeConsole('info', args, line, 'warn')),
        error: builtin('console.error', (args, line) => writeConsole('error', args, line)),
      },
    }
    env.define('console', consoleObj, 'builtin')
    env.define('setTimeout', builtin('setTimeout', (args, line) => scheduleTimer(args, line, 'timeout')), 'builtin')
    env.define('setInterval', builtin('setInterval', (args, line) => scheduleTimer(args, line, 'interval')), 'builtin')
    env.define(
      'clearTimeout',
      builtin('clearTimeout', (args, line) => {
        const removed = cancelTimer(Number(args[0]))
        snapshot(
          removed.removed
            ? `clearTimeout снимает таймер #${Number(args[0])}${removed.label ? ` с колбэком «${removed.label}»` : ''}. Колбэк ещё не выполнялся, и в Call Stack он уже не попадёт.`
            : `clearTimeout ничего не отменил: таймера #${Number(args[0])} уже нет ни в Web API, ни в Macrotask Queue.`,
          line,
          'webapi',
        )
      }),
      'builtin',
    )
    env.define(
      'clearInterval',
      builtin('clearInterval', (args, line) => {
        const removed = cancelTimer(Number(args[0]))
        snapshot(
          removed.removed
            ? `clearInterval останавливает таймер #${Number(args[0])}${removed.label ? ` с колбэком «${removed.label}»` : ''}. Следующие повторы больше не запланируются.`
            : `clearInterval ничего не остановил: интервала #${Number(args[0])} уже нет ни в Web API, ни в Macrotask Queue.`,
          line,
          'webapi',
        )
      }),
      'builtin',
    )
    env.define(
      'queueMicrotask',
      builtin('queueMicrotask', (args, line) => {
        const callback = asFn(args[0])
        if (!callback) throw new Error('queueMicrotask ожидает функцию')
        microtasks.push({
          id: uid(),
          label: callback.label,
          line: callback.line,
          start: callback.start,
          end: callback.end,
          run() {
            entryHint = takeMicro(callback.label)
            invoke(callback, [], callback.line)
          },
        })
        snapshot(
          `queueMicrotask ставит «${callback.label}» в Microtask Queue. Это не таймер. Колбэк выполнится, когда текущий код на Call Stack закончится, раньше любой макрозадачи.`,
          line,
          'micro',
        )
      }),
      'builtin',
    )
    env.define('Promise', { __type: 'promiseCtor' } satisfies PromiseCtor, 'builtin')
    env.define('undefined', undefined, 'const')
    env.define('NaN', Number.NaN, 'const')
    env.define('Infinity', Number.POSITIVE_INFINITY, 'const')
  }

  function hoist(stmts: AstNode[], env: Env) {
    for (const stmt of stmts) {
      if (stmt.type === 'FunctionDeclaration' && (stmt.id as AstNode | null)?.type === 'Identifier') {
        env.define(String((stmt.id as AstNode).name), makeFunction(stmt, env), 'var')
      }
      if (stmt.type === 'VariableDeclaration' && stmt.kind === 'var') {
        for (const decl of list(stmt.declarations)) {
          if ((decl.id as AstNode).type === 'Identifier') env.defineVar(String((decl.id as AstNode).name), undefined)
        }
      }
    }
  }

  function execStmts(stmts: AstNode[], env: Env) {
    hoist(stmts, env)
    for (const stmt of stmts) execStmt(stmt, env)
  }

  function execBlock(node: AstNode, env: Env) {
    const blockEnv = new Env(env)
    execStmts(list(node.body), blockEnv)
  }

  function execVar(stmt: AstNode, env: Env) {
    for (const decl of list(stmt.declarations)) {
      if ((decl.id as AstNode).type !== 'Identifier') throw new Error('Деструктуризация не поддерживается')
      const name = String((decl.id as AstNode).name)
      const value = decl.init ? evalExpr(decl.init as AstNode, env) : undefined
      if (stmt.kind === 'var') env.defineVar(name, value)
      else env.define(name, value, stmt.kind === 'const' ? 'const' : 'let')
    }
  }

  function loopGuard(count: number) {
    if (count > MAX_LOOP) throw new Error('Слишком много итераций цикла')
  }

  function execLoopBody(body: AstNode, env: Env) {
    try {
      execStmt(body, env)
      return 'next' as const
    } catch (error) {
      if (error instanceof ContinueSignal) return 'next' as const
      if (error instanceof BreakSignal) return 'break' as const
      throw error
    }
  }

  function execFor(node: AstNode, env: Env) {
    const init = node.init as AstNode | null
    const lexical = init?.type === 'VariableDeclaration' && init.kind !== 'var'
    if (init?.type === 'VariableDeclaration') {
      if (init.kind === 'var') execVar(init, env)
    } else if (init) evalExpr(init, env)

    let iteration = lexical ? new Env(env) : env
    if (lexical && init?.type === 'VariableDeclaration') execVar(init, iteration)

    let guard = 0
    while (guard++ <= MAX_LOOP) {
      loopGuard(guard)
      if (node.test && !truthy(evalExpr(node.test as AstNode, iteration))) break
      const signal = execLoopBody(node.body as AstNode, iteration)
      if (signal === 'break') break
      if (!node.update) continue
      const next = lexical ? copyEnv(iteration, env) : iteration
      if (lexical) iteration = next
      evalExpr(node.update as AstNode, iteration)
    }
  }

  function execForOf(node: AstNode, env: Env) {
    const right = evalExpr(node.right as AstNode, env)
    if (!Array.isArray(right)) throw new Error('for...of поддерживает только массивы')
    const left = node.left as AstNode
    for (const item of right) {
      const iter = new Env(env)
      if (left.type === 'VariableDeclaration') {
        const decl = list(left.declarations)[0]
        if ((decl.id as AstNode).type !== 'Identifier') throw new Error('Деструктуризация не поддерживается')
        const kind = left.kind === 'const' ? 'const' : left.kind === 'var' ? 'var' : 'let'
        if (kind === 'var') env.defineVar(String((decl.id as AstNode).name), item)
        else iter.define(String((decl.id as AstNode).name), item, kind)
      } else if (left.type === 'Identifier') env.set(String(left.name), item)
      else throw new Error('Такой for...of не поддерживается')
      const signal = execLoopBody(node.body as AstNode, left.type === 'VariableDeclaration' && left.kind === 'var' ? env : iter)
      if (signal === 'break') break
    }
  }

  function execTry(node: AstNode, env: Env) {
    let signal: unknown = null
    try {
      execStmt(node.block as AstNode, env)
    } catch (error) {
      if (error instanceof LimitError) throw error
      if (error instanceof ReturnSignal || error instanceof BreakSignal || error instanceof ContinueSignal || !node.handler) {
        signal = error
      } else {
        const catchEnv = new Env(env)
        const param = (node.handler as AstNode).param as AstNode | null
        if (param?.type === 'Identifier') catchEnv.define(String(param.name), error instanceof Error ? error.message : error, 'let')
        try {
          execStmt((node.handler as AstNode).body as AstNode, catchEnv)
        } catch (caught) {
          signal = caught
        }
      }
    }
    if (node.finalizer) execStmt(node.finalizer as AstNode, env)
    if (signal) throw signal
  }

  function execStmt(stmt: AstNode, env: Env) {
    switch (stmt.type) {
      case 'EmptyStatement':
      case 'DebuggerStatement':
      case 'FunctionDeclaration':
        return
      case 'ExpressionStatement':
        evalExpr(stmt.expression as AstNode, env)
        return
      case 'VariableDeclaration':
        execVar(stmt, env)
        return
      case 'BlockStatement': {
        const blockEnv = new Env(env)
        execStmts(list(stmt.body), blockEnv)
        return
      }
      case 'ReturnStatement':
        throw new ReturnSignal(stmt.argument ? evalExpr(stmt.argument as AstNode, env) : undefined)
      case 'IfStatement':
        if (truthy(evalExpr(stmt.test as AstNode, env))) execStmt(stmt.consequent as AstNode, env)
        else if (stmt.alternate) execStmt(stmt.alternate as AstNode, env)
        return
      case 'ForStatement':
        execFor(stmt, env)
        return
      case 'ForOfStatement':
        execForOf(stmt, env)
        return
      case 'WhileStatement': {
        let guard = 0
        while (truthy(evalExpr(stmt.test as AstNode, env))) {
          loopGuard(++guard)
          if (execLoopBody(stmt.body as AstNode, env) === 'break') break
        }
        return
      }
      case 'DoWhileStatement': {
        let guard = 0
        do {
          loopGuard(++guard)
          if (execLoopBody(stmt.body as AstNode, env) === 'break') break
        } while (truthy(evalExpr(stmt.test as AstNode, env)))
        return
      }
      case 'BreakStatement':
        throw new BreakSignal()
      case 'ContinueStatement':
        throw new ContinueSignal()
      case 'ThrowStatement': {
        const reason = evalExpr(stmt.argument as AstNode, env)
        throw reason instanceof Error ? reason : new Error(formatValue(reason))
      }
      case 'TryStatement':
        execTry(stmt, env)
        return
      case 'ClassDeclaration':
      case 'ClassExpression':
        throw new Error('Классы в визуализаторе не поддерживаются')
      default:
        throw new Error(`Инструкция ${stmt.type} не поддерживается`)
    }
  }

  function reportUnhandled() {
    for (const promise of promises) {
      if (promise.state === 'rejected' && !promise.handled) {
        log('error', `Unhandled rejection: ${formatValue(promise.value)}`)
        snapshot(
          `Промис отклонён, а обработчика нет: ни catch, ни then с ошибкой. Причина «${formatValue(promise.value)}» попадает в консоль.`,
          promise.line || null,
          'console',
        )
        promise.handled = true
      }
    }
  }

  function pump() {
    let spins = 0
    while (spins++ < MAX_STEPS) {
      if (microtasks.length) {
        microtasks.shift()?.run()
        continue
      }
      if (macrotasks.length) {
        macrotasks.shift()?.run()
        continue
      }
      if (promoteDue()) continue
      const waiting = webApis.filter((timer) => Number.isFinite(timer.expiresAt))
      if (waiting.length) {
        now = Math.min(...waiting.map((timer) => timer.expiresAt))
        const due = waiting.find((timer) => timer.expiresAt === now)
        snapshot(
          `Виртуальное время переходит к ${now} мс. Реальные миллисекунды не идут. До этой отметки дождался таймер «${due?.label ?? waiting[0]?.label}»: на следующем шаге его колбэк перейдёт из Web API в Macrotask Queue.`,
          due?.line ?? waiting[0]?.line ?? null,
          'webapi',
        )
        continue
      }
      break
    }
    reportUnhandled()
    snapshot('Готово. Call Stack пуст. В Web API, Microtask Queue и Macrotask Queue ничего не осталось: всё запланированное уже выполнилось.', null, 'loop')
  }

  const global = new Env(null)
  global.isFunction = true
  registerGlobals(global)

  try {
    snapshot(
      'Скрипт начинает выполняться сверху вниз. На Call Stack пока пусто: отдельной функции у всего скрипта нет, код идёт с первой строки. Пока этот код не закончится и Call Stack не станет пустым, Event Loop не будет брать задачи из очередей.',
      1,
      'stack',
    )
    execStmts(list(ast.body), global)
    const idleMessage = microtasks.length
      ? `Call Stack пуст. В Microtask Queue ${ru(microtasks.length, 'задача', 'задачи', 'задач')}, первая — «${microtasks[0]?.label}». Event Loop сначала выполнит все микрозадачи, по одной. Макрозадачу он возьмёт только после них.`
      : macrotasks.length
        ? `Call Stack пуст. Микрозадач нет. В Macrotask Queue ${ru(macrotasks.length, 'задача', 'задачи', 'задач')}, первая — «${macrotasks[0]?.label}». Event Loop возьмёт только её.${macrotasks.length > 1 ? ' Остальные подождут следующих проходов: за один раз берётся одна макрозадача.' : ' Других макрозадач в очереди нет.'}`
        : webApis.length
          ? `Call Stack пуст. Microtask Queue и Macrotask Queue пусты. В Web API ещё ${ru(webApis.length, 'таймер', 'таймера', 'таймеров')}: задержка не вышла, поэтому в очередь они пока не переходят.`
          : 'Call Stack пуст. Очереди пусты: весь этот код был синхронным и уже выполнился. Event Loop брать нечего.'
    snapshot(idleMessage, null, 'loop')
    pump()
  } catch (error) {
    if (error instanceof LimitError) return steps
    const message = error instanceof Error ? error.message : String(error)
    log('error', message)
    snapshot(message, null, 'console')
  }

  return steps
}
