import { EXAMPLE_NOTES } from '../exampleNotes.ts'
import { EXAMPLES } from '../examples.ts'
import { useVisualizer } from '../store.ts'

const INTRO =
  'Нажмите «Запуск» или «Шаг». На каждом шаге здесь будет написано, что сейчас произошло: где выполняется код, в какую очередь попала задача и почему следующей будет именно она.'

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
  const matched = EXAMPLES.find((example) => example.code === code)?.id
  const answer = status === 'done' && matched ? EXAMPLE_NOTES[matched]?.answer : undefined
  const progress = total > 0 && index >= 0 ? `${index + 1} / ${total}` : `0 / ${total || 0}`

  return (
    <section className={`step-banner ${invalid ? 'is-error' : ''}`} aria-live="polite">
      <div className="step-banner-body">
        <p className="step-banner-text">{message}</p>
        <p className="step-banner-meta">
          {progress}
          <span aria-hidden="true"> · </span>
          t = {time} мс
        </p>
        {answer ? <p className="step-answer">{answer}</p> : null}
      </div>
    </section>
  )
}
