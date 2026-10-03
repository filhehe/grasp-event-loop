export type Tone = 'plain' | 'keyword' | 'function' | 'string' | 'number' | 'comment' | 'punct'

export type Token = {
  text: string
  tone: Tone
}

const KEYWORDS = new Set([
  'await',
  'async',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'of',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
])

export function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  const push = (text: string, tone: Tone) => {
    if (!text) return
    const last = tokens.at(-1)
    if (last?.tone === tone) last.text += text
    else tokens.push({ text, tone })
  }

  while (index < code.length) {
    const rest = code.slice(index)

    if (rest.startsWith('//')) {
      const end = code.indexOf('\n', index)
      const stop = end === -1 ? code.length : end
      push(code.slice(index, stop), 'comment')
      index = stop
      continue
    }

    if (rest.startsWith('/*')) {
      const end = code.indexOf('*/', index + 2)
      const stop = end === -1 ? code.length : end + 2
      push(code.slice(index, stop), 'comment')
      index = stop
      continue
    }

    if (rest.startsWith('`')) {
      const template = readTemplate(code, index)
      for (const token of template.tokens) push(token.text, token.tone)
      index = template.index
      continue
    }

    const string = readQuoted(code, index)
    if (string) {
      push(string, 'string')
      index += string.length
      continue
    }

    const number = rest.match(/^(?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/)
    if (number && !/^[\d.]/.test(code[index - 1] ?? '')) {
      push(number[0], 'number')
      index += number[0].length
      continue
    }

    const word = rest.match(/^[A-Za-z_$][\w$]*/)
    if (word) {
      const name = word[0]
      const call = /^\s*\(/.test(code.slice(index + name.length))
      push(name, KEYWORDS.has(name) ? 'keyword' : call ? 'function' : 'plain')
      index += name.length
      continue
    }

    const space = rest.match(/^\s+/)
    if (space) {
      push(space[0], 'plain')
      index += space[0].length
      continue
    }

    const operator = rest.match(/^(?:===|!==|==|!=|<=|>=|=>|\+\+|--|&&|\|\||\?\?|\*\*|<<|>>>|>>)/)
    if (operator) {
      push(operator[0], 'punct')
      index += operator[0].length
      continue
    }

    push(code[index], 'punct')
    index += 1
  }

  return tokens
}

function readQuoted(code: string, start: number) {
  const quote = code[start]
  if (quote !== '"' && quote !== "'") return null
  let index = start + 1
  while (index < code.length) {
    if (code[index] === '\\') {
      index += 2
      continue
    }
    if (code[index] === quote) return code.slice(start, index + 1)
    if (code[index] === '\n') break
    index += 1
  }
  return code.slice(start, index)
}

function readTemplate(code: string, start: number) {
  const tokens: Token[] = []
  let index = start + 1
  let chunk = '`'

  while (index < code.length) {
    if (code[index] === '\\') {
      chunk += code.slice(index, index + 2)
      index += 2
      continue
    }
    if (code[index] === '`') {
      tokens.push({ text: `${chunk}\``, tone: 'string' })
      return { tokens, index: index + 1 }
    }
    if (code[index] === '$' && code[index + 1] === '{') {
      if (chunk) tokens.push({ text: chunk, tone: 'string' })
      tokens.push({ text: '${', tone: 'punct' })
      index += 2
      let depth = 1
      const exprStart = index
      while (index < code.length && depth > 0) {
        if (code[index] === '{') depth += 1
        else if (code[index] === '}') depth -= 1
        if (depth > 0) index += 1
      }
      tokens.push(...tokenize(code.slice(exprStart, index)))
      tokens.push({ text: '}', tone: 'punct' })
      index += 1
      chunk = ''
      continue
    }
    chunk += code[index]
    index += 1
  }

  tokens.push({ text: chunk, tone: 'string' })
  return { tokens, index }
}
