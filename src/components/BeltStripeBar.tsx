export function BeltStripeBar({ total, done }: { total: number; done: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={done}
      aria-valuemax={total}
      style={{
        height: 14,
        backgroundColor: 'var(--ink)',
        borderRadius: 3,
        display: 'flex',
        gap: 2,
        padding: 2,
        boxSizing: 'border-box',
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            backgroundColor: i < done ? 'var(--mat)' : 'transparent',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  )
}
