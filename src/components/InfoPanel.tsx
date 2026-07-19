import { useEffect } from 'react'

interface InfoPanelProps {
  open: boolean
  onClose: () => void
}

export function InfoPanel({ open, onClose }: InfoPanelProps) {
  // Handle Escape key
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function handleScrimClick(e: React.MouseEvent) {
    // Close only if clicking the scrim itself, not children
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleScrimClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-panel-title"
        style={{
          background: '#fff',
          borderRadius: 'var(--radius)',
          padding: '24px',
          maxWidth: '560px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header with Close button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 id="info-panel-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>How to read this chart</h2>
          <button
            type="button"
            className="btn-quiet"
            onClick={onClose}
            style={{ width: 'auto', minWidth: '80px' }}
          >
            Close
          </button>
        </div>

        {/* Four explainer sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: '1.6' }}>
          {/* Section 1: Belt population and curves */}
          <section>
            <p style={{ margin: 0 }}>
              Each curve is a belt population. The horizontal axis is ability — further right, harder to deal with. The curves overlap on purpose: an exceptional purple belt is a harder round than an out-of-practice black belt. Belt color is a decent proxy for ability, not a guarantee.
            </p>
          </section>

          {/* Section 2: How to use / one tap */}
          <section>
            <p style={{ margin: 0 }}>
              One tap answers the question. Place the line where opponents start to shut this down. Left of your line: it works more often than not. Right of your line: where it starts to fail.
            </p>
          </section>

          {/* Section 3: No answer is honest data */}
          <section>
            <p style={{ margin: 0 }}>
              No answer to this yet is honest data too — it marks a place to start, not a failure.
            </p>
          </section>

          {/* Section 4: Caveat about illustrative nature and r ≈ .29 */}
          <section>
            <p style={{ margin: 0 }}>
              The curves are illustrative — informed by public belt-registration data, directional rather than scientific. Your tap is a self-estimate, and self-assessment tracks measured skill at about r ≈ .29. Read the picture as a mirror, not a measurement.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
