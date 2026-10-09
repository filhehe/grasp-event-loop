import { EXAMPLE_NOTES } from '../exampleNotes.ts'
import { EXAMPLES } from '../examples.ts'
import { useVisualizer } from '../store.ts'

function nextInLevel(id: string) {
  const level = EXAMPLE_NOTES[id]?.level
  if (!level) return undefined
  const same = EXAMPLES.filter((example) => EXAMPLE_NOTES[example.id]?.level === level)
  const index = same.findIndex((example) => example.id === id)
  return index >= 0 ? same[index + 1] : undefined
}

const INTRO =
  'Press Run or Step. Each step says what just happened: where the code is running, which queue received the task, and why that task is next.'

export function StepBanner() {
  const code = useVisualizer((state) => state.code)
  const status = useVisualizer((state) => state.status)
  const index = useVisualizer((state) => state.index)
  const total = useVisualizer((state) => state.steps.length)
  const message = useVisualizer((state) =>
    state.error ?? (state.index >= 0 ? state.steps[state.index].message : INTRO),
  )
  const time = useVisualizer((state) => (state.index >= 0 ? state.steps[state.index].time : 0))
  const invalid = useVisualizer((state) => state.error != null)
  const setCode = useVisualizer((state) => state.setCode)
  const matched = EXAMPLES.find((example) => example.code === code)?.id
  const answer = status === 'done' && matched ? EXAMPLE_NOTES[matched]?.answer : undefined
  const next = matched && status === 'done' ? nextInLevel(matched) : undefined
  const progress = total > 0 && index >= 0 ? `${index + 1} / ${total}` : `0 / ${total || 0}`

  return (
    <section className={`step-banner ${invalid ? 'is-error' : ''}`} aria-live="polite">
      <div className="step-banner-body">
        <p className="step-banner-text">{message}</p>
        <p className="step-banner-meta">
          {progress}
          <span aria-hidden="true"> · </span>
          t = {time} ms
        </p>
        {answer ? (
          <div className="step-answer">
            <p>{answer}</p>
            {next ? (
              <button type="button" className="toolbar-btn step-next" onClick={() => setCode(next.code)}>
                Next example
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
