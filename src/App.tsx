import { useState } from 'react'
type Screen = 'intro' | 'intake' | 'sweep' | 'interim' | 'category' | 'results'
export default function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  if (screen === 'intro') return (
    <main>
      <h1>Skill-Check</h1>
      <p>A structured mirror for your grappling — not a verdict. Self-assessed skill correlates about r ≈ .29 with measured skill, so treat every number here as a starting point for a conversation with your training.</p>
      <button className="btn" onClick={() => setScreen('intake')}>Start the sweep</button>
    </main>
  )
  return <main /> // subsequent screens land in Tasks 5–7
}
