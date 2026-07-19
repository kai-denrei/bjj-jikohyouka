interface BeltStripeBarProps {
  total: number
  done: number
  current?: number | null
  label?: string
  annotation?: string
}

export function BeltStripeBar({ total, done, current = null, label, annotation }: BeltStripeBarProps) {
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={done}
        aria-valuemax={total}
        style={{
          display: 'flex',
          gap: 2,
          height: 8,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const state: 'done' | 'current' | 'todo' =
            i < done ? 'done'
            : i === current ? 'current'
            : 'todo'
          return (
            <div
              key={i}
              data-state={state}
              style={{
                flex: 1,
                borderRadius: 2,
                backgroundColor: state === 'done' ? 'var(--ink)' : 'transparent',
                border: state === 'current' ? '2px solid var(--accent)' : '1px solid var(--line)',
                boxSizing: 'border-box',
              }}
            />
          )
        })}
      </div>
      {(label || annotation) && (
        <div
          className="mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            marginTop: 4,
            color: 'var(--ink-2)',
          }}
        >
          <span>{label}</span>
          <span>{annotation}</span>
        </div>
      )}
    </div>
  )
}
