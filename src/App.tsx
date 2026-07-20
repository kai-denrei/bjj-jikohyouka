import { useState, useEffect, useRef } from 'react'
import { bank } from './lib/bankInstance'
import { loadSession, saveSession, clearSession } from './lib/results/store'
import { scoreAnswers, type Report } from './lib/results/score'
import { sweepQuestions, recommendedDrilldowns, drilldownQuestions, includeDrafts, includeAdmin } from './lib/flow'
import { IntakeStep } from './components/IntakeStep'
import { BeltStripeBar } from './components/BeltStripeBar'
import { QuestionScreen } from './components/QuestionScreen'
import { InterimScreen } from './components/InterimScreen'
import { ResultsPage } from './components/results/ResultsPage'
import type { AssessmentSession, StoredAnswer, Intake } from './lib/results/types'

type Screen = 'intro' | 'intake' | 'sweep' | 'interim' | 'category' | 'results'

const positionalCategories = bank.categories.filter(c => c.axis === 'positional')

export default function App() {
  const search = window.location.search
  const admin = includeAdmin(search)
  const drafts = includeDrafts(search) || admin
  const availableCategoryIds = new Set(
    bank.categories
      .filter(c => drilldownQuestions(bank, c.id, drafts).length > 0)
      .map(c => c.id)
  )
  const [screen, setScreen] = useState<Screen>('intro')
  const [session, setSession] = useState<AssessmentSession | null>(null)
  const sessionRef = useRef<AssessmentSession | null>(null)
  const [completedCategories, setCompletedCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [resumeSession, setResumeSession] = useState<AssessmentSession | null>(null)
  const [sweepStartIndex, setSweepStartIndex] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)

  useEffect(() => {
    const saved = loadSession()
    if (saved) {
      setResumeSession(saved)
    }
  }, [])

  function setSessionAndRef(s: AssessmentSession | null) {
    sessionRef.current = s
    setSession(s)
  }

  function startNewSession(intake: Intake | null) {
    const newSession: AssessmentSession = {
      bankVersion: bank.meta.bankVersion,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      intake,
      answers: {},
      completedCategories: [],
    }
    setSessionAndRef(newSession)
    saveSession(newSession)
    setSweepStartIndex(0)
    setSessionFinished(false)
    setScreen('sweep')
  }

  function handleResume() {
    if (!resumeSession) return
    setSessionAndRef(resumeSession)
    setCompletedCategories(resumeSession.completedCategories)
    setResumeSession(null)
    // Restore appropriate screen based on session state
    if (resumeSession.completedCategories.length > 0) {
      const rep = scoreAnswers(resumeSession.answers, bank)
      setReport(rep)
      setScreen('interim')
    } else {
      // Fix 3: if all sweep questions already answered, go straight to interim
      const sweepQs = sweepQuestions(bank, drafts)
      const allAnswered = sweepQs.every(q => q.qid in resumeSession.answers)
      if (allAnswered) {
        const rep = scoreAnswers(resumeSession.answers, bank)
        setReport(rep)
        setScreen('interim')
      } else {
        const firstUnanswered = sweepQs.findIndex(q => !(q.qid in resumeSession.answers))
        setSweepStartIndex(firstUnanswered === -1 ? 0 : firstUnanswered)
        setScreen('sweep')
      }
    }
  }

  function handleStartOver() {
    clearSession()
    setResumeSession(null)
    setSessionAndRef(null)
    setCompletedCategories([])
    setActiveCategory(null)
    setReport(null)
    setSweepStartIndex(0)
    setSessionFinished(false)
    setScreen('intake')
  }

  function handlePauseSweep() {
    // Pause during sweep: find the current unanswered question index to resume at
    if (!sessionRef.current) return
    const sweepQsNow = sweepQuestions(bank, drafts)
    const firstUnanswered = sweepQsNow.findIndex(q => !(q.qid in sessionRef.current!.answers))
    setSweepStartIndex(firstUnanswered === -1 ? 0 : firstUnanswered)
    // Expose the current session as the resume target (without a page reload)
    setResumeSession(sessionRef.current)
    setScreen('intro')
  }

  function handlePauseDrilldown() {
    // Pause during drill-down: recompute report and go to interim
    if (!sessionRef.current) return
    const rep = scoreAnswers(sessionRef.current.answers, bank)
    setReport(rep)
    setScreen('interim')
  }

  function handleAnswer(a: StoredAnswer) {
    if (!sessionRef.current) return
    const newAnswers = { ...sessionRef.current.answers, [a.qid]: a }
    const newSession = { ...sessionRef.current, answers: newAnswers }
    setSessionAndRef(newSession)
    saveSession(newSession)
  }

  function handleSweepDone() {
    if (!sessionRef.current) return
    const rep = scoreAnswers(sessionRef.current.answers, bank)
    setReport(rep)
    setScreen('interim')
  }

  function handlePickCategory(categoryId: string) {
    if (!sessionRef.current) return
    setActiveCategory(categoryId)
    setScreen('category')
  }

  function handleCategoryDone() {
    if (!activeCategory || !sessionRef.current) return
    const newCompleted = [...completedCategories, activeCategory]
    setCompletedCategories(newCompleted)
    const newSession = { ...sessionRef.current, completedCategories: newCompleted }
    setSessionAndRef(newSession)
    saveSession(newSession)
    // Recompute report
    const rep = scoreAnswers(newSession.answers, bank)
    setReport(rep)
    setActiveCategory(null)
    setScreen('interim')
  }

  const sweepQs = sweepQuestions(bank, drafts)
  const recommended = report ? recommendedDrilldowns(report, bank) : []

  const activeCategoryName = activeCategory
    ? bank.categories.find(c => c.id === activeCategory)?.name ?? activeCategory
    : ''

  // Sweep progress: count answered sweep questions and find first unanswered
  const sweepAnsweredCount = session
    ? sweepQs.filter(q => q.qid in session.answers).length
    : 0
  const sweepCurrentIndex = session
    ? sweepQs.findIndex(q => !(q.qid in session.answers))
    : 0
  const sweepCurrentCategory = sweepCurrentIndex >= 0 && sweepCurrentIndex < sweepQs.length
    ? (bank.categories.find(c => c.id === sweepQs[sweepCurrentIndex].category)?.name ?? 'Sweep')
    : 'Sweep'

  return (
    <main>
      {admin && (
        <div
          className="mono"
          style={{
            position: 'fixed',
            left: 12,
            bottom: 12,
            zIndex: 50,
            padding: '2px 8px',
            border: '1px solid var(--accent)',
            background: 'var(--mat)',
            borderRadius: 'var(--radius)',
          }}
        >
          admin
        </div>
      )}
      {(screen === 'sweep' || screen === 'interim' || screen === 'category' || screen === 'results') && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <BeltStripeBar
                total={positionalCategories.length}
                done={screen === 'sweep' ? sweepAnsweredCount : completedCategories.length}
                current={
                  screen === 'sweep'
                    ? (sweepCurrentIndex >= 0 ? sweepCurrentIndex : null)
                    : screen === 'category'
                    ? positionalCategories.findIndex(c => c.id === activeCategory)
                    : null
                }
                label={
                  screen === 'sweep' ? sweepCurrentCategory
                    : screen === 'category' ? activeCategoryName
                    : screen === 'interim' ? 'First picture'
                    : 'Results'
                }
                annotation={
                  screen === 'sweep'
                    ? `${sweepAnsweredCount}/${sweepQs.length}`
                    : `${completedCategories.length}/${positionalCategories.length}`
                }
              />
            </div>
            {(screen === 'sweep' || screen === 'category') && (
              <button
                type="button"
                className="btn-quiet"
                style={{ flexShrink: 0 }}
                onClick={screen === 'sweep' ? handlePauseSweep : handlePauseDrilldown}
              >
                Pause
              </button>
            )}
          </div>
        </div>
      )}

      {screen === 'intro' && (
        <>
          <h1>Skill-Check</h1>
          <p>A structured mirror for your grappling — not a verdict. Self-assessed skill correlates about r ≈ .29 with measured skill, so treat every number here as a starting point for a conversation with your training.</p>
          {resumeSession && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button className="btn" onClick={handleResume}>Continue where you left off</button>
              <button className="btn-quiet" onClick={handleStartOver}>Start over</button>
            </div>
          )}
          {!resumeSession && (
            <button className="btn" onClick={() => setScreen('intake')}>Start the sweep</button>
          )}
        </>
      )}

      {screen === 'intake' && (
        <IntakeStep onSubmit={startNewSession} />
      )}

      {screen === 'sweep' && session && (
        <QuestionScreen
          questions={sweepQs}
          answers={session.answers}
          onAnswer={handleAnswer}
          onDone={handleSweepDone}
          bank={bank}
          initialIndex={sweepStartIndex}
          admin={admin}
        />
      )}

      {screen === 'interim' && report && (
        <InterimScreen
          report={report}
          onPick={handlePickCategory}
          onResults={() => setScreen('results')}
          recommended={recommended}
          availableCategoryIds={availableCategoryIds}
        />
      )}

      {screen === 'category' && session && activeCategory && (
        <QuestionScreen
          questions={drilldownQuestions(bank, activeCategory, drafts)}
          answers={session.answers}
          onAnswer={handleAnswer}
          onDone={handleCategoryDone}
          withinRunCounter={true}
          bank={bank}
          admin={admin}
        />
      )}

      {screen === 'results' && report && (
        <>
          <ResultsPage
            report={report}
            onRetakeCategory={(categoryId) => {
              handlePickCategory(categoryId)
            }}
            availableCategoryIds={availableCategoryIds}
            belt={session?.intake?.belt ?? null}
            session={session}
            onFinish={() => { setSessionAndRef(null); setSessionFinished(true) }}
          />
          {!sessionFinished && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => setScreen('interim')}
              >
                Back to categories
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
