/**
 * VizTabs — tablist hosting Spider (Radar) / Depth (DepthBars) / Heat (HeatMap)
 * Task 2, verdict #5.
 *
 * - role="tablist" with three .mono tabs: Spider · Depth · Heat
 * - Keyboard: ArrowLeft/ArrowRight move focus; Enter/Space activate
 * - Selected tab underlined var(--accent)
 * - localStorage persistence: skillcheck.viztab.v1
 * - Tokens only, no literals.
 */
import { useRef, useState } from 'react'
import type { CategoryScore } from '../../lib/results/score'
import { Radar } from './Radar'
import { DepthBars } from './DepthBars'
import { HeatMap } from './HeatMap'

interface VizTabsProps {
  categories: CategoryScore[]
}

type TabId = 'spider' | 'depth' | 'heat'

const TABS: { id: TabId; label: string }[] = [
  { id: 'spider', label: 'Spider' },
  { id: 'depth', label: 'Depth' },
  { id: 'heat', label: 'Heat' },
]

const STORAGE_KEY = 'skillcheck.viztab.v1'

function readStorage(): TabId {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'spider' || v === 'depth' || v === 'heat') return v
  } catch {
    // ignore
  }
  return 'spider'
}

function writeStorage(tab: TabId) {
  try {
    localStorage.setItem(STORAGE_KEY, tab)
  } catch {
    // ignore
  }
}

export function VizTabs({ categories }: VizTabsProps) {
  const [active, setActive] = useState<TabId>(() => readStorage())
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function activate(id: TabId) {
    setActive(id)
    writeStorage(id)
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    // Automatic activation: arrow keys move focus AND activate the focused tab.
    // This follows WAI-ARIA best practices for tablist with automatic activation.
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = (idx + 1) % TABS.length
      tabRefs.current[next]?.focus()
      activate(TABS[next].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = (idx - 1 + TABS.length) % TABS.length
      tabRefs.current[prev]?.focus()
      activate(TABS[prev].id)
    }
  }

  return (
    <div>
      {/* Tablist */}
      <div
        role="tablist"
        aria-label="Visualization tabs"
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--line)',
          marginBottom: 16,
        }}
      >
        {TABS.map((tab, idx) => {
          const isSelected = active === tab.id
          return (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[idx] = el }}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`viztab-panel-${tab.id}`}
              id={`viztab-${tab.id}`}
              className="mono"
              tabIndex={isSelected ? 0 : -1}
              onClick={() => activate(tab.id)}
              onKeyDown={e => handleKeyDown(e, idx)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '8px 16px',
                cursor: 'pointer',
                color: isSelected ? 'var(--ink)' : 'var(--ink-2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab panels — only active panel renders (unmount keeps memory manageable) */}
      <div
        id="viztab-panel-spider"
        role="tabpanel"
        aria-labelledby="viztab-spider"
        hidden={active !== 'spider'}
        style={{ display: active === 'spider' ? 'block' : 'none' }}
      >
        {active === 'spider' && <Radar categories={categories} />}
      </div>

      <div
        id="viztab-panel-depth"
        role="tabpanel"
        aria-labelledby="viztab-depth"
        hidden={active !== 'depth'}
        style={{ display: active === 'depth' ? 'block' : 'none' }}
      >
        {active === 'depth' && <DepthBars categories={categories} />}
      </div>

      <div
        id="viztab-panel-heat"
        role="tabpanel"
        aria-labelledby="viztab-heat"
        hidden={active !== 'heat'}
        style={{ display: active === 'heat' ? 'block' : 'none' }}
      >
        {active === 'heat' && <HeatMap categories={categories} />}
      </div>
    </div>
  )
}
