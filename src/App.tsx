import { useState, useEffect } from 'react'
import { bank } from './lib/bankInstance'
import { loadSession, saveSession, clearSession } from './lib/results/store'
import { scoreAnswers, type Report } from './lib/results/score'
import { sweepQuestions, recommendedDrilldowns, drilldownQuestions, includeDrafts } from './lib/flow'
import { IntakeStep } from './components/IntakeStep'
import { BeltStripeBar } from './components/BeltStripeBar'
import { QuestionScreen } from './components/QuestionScreen'
import { InterimScreen } from './components/InterimScreen'
import type { AssessmentSession, StoredAnswer, Intake } from './lib/results/types'

type Screen = 'intro' | 'intake' | 'sweep' | 'interim' | 'category' | 'results'

const positionalCategories = bank.categories.filter(c => c.axis === 'positional')
const drafts = includeDrafts(window.location.search)

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [session, setSession] = useState<AssessmentSession | null>(null)
  const [completedCategories, setCompletedCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [resumeSession, setResumeSession] = useState<AssessmentSession | null>(null)

  useEffect(() => {
    const saved = loadSession()
    if (saved) {
      setResumeSession(saved)
    }
  }, [])

  function startNewSession(intake: Intake | null) {
    const newSession: AssessmentSession = {
      bankVersion: bank.meta.bankVersion,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      intake,
      answers: {},
      completedCategories: [],
    }
    setSession(newSession)
    saveSession(newSession)
    setScreen('sweep')
  }

  function handleResume() {
    if (!resumeSession) return
    setSession(resumeSession)
    setCompletedCategories(resumeSession.completedCategories)
    setResumeSession(null)
    // Restore appropriate screen based on session state
    if (resumeSession.completedCategories.length > 0) {
      const rep = scoreAnswers(resumeSession.answers, bank)
      setReport(rep)
      setScreen('interim')
    } else {
      setScreen('sweep')
    }
  }

  function handleStartOver() {
    clearSession()
    setResumeSession(null)
    setSession(null)
    setCompletedCategories([])
    setActiveCategory(null)
    setReport(null)
    setScreen('intake')
  }

  function handleAnswer(a: StoredAnswer) {
    if (!session) return
    const newAnswers = { ...session.answers, [a.qid]: a }
    const newSession = { ...session, answers: newAnswers }
    setSession(newSession)
    saveSession(newSession)
  }

  function handleSweepDone() {
    if (!session) return
    const rep = scoreAnswers(session.answers, bank)
    setReport(rep)
    setScreen('interim')
  }

  function handlePickCategory(categoryId: string) {
    setActiveCategory(categoryId)
    setScreen('category')
  }

  function handleCategoryDone() {
    if (!activeCategory || !session) return
    const newCompleted = [...completedCategories, activeCategory]
    setCompletedCategories(newCompleted)
    const newSession = { ...session, completedCategories: newCompleted }
    setSession(newSession)
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

  return (
    <main>
      {(screen === 'sweep' || screen === 'interim' || screen === 'category' || screen === 'results') && (
        <div style={{ marginBottom: 16 }}>
          <BeltStripeBar total={positionalCategories.length} done={completedCategories.length} />
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

      {screen === 'sweep' && session && (() => {
        const firstUnanswered = sweepQs.findIndex(q => !(q.qid in session.answers))
        const sweepInitialIndex = firstUnanswered === -1 ? sweepQs.length - 1 : firstUnanswered
        return (
          <QuestionScreen
            questions={sweepQs}
            answers={session.answers}
            onAnswer={handleAnswer}
            onDone={handleSweepDone}
            heading="Sweep"
            bank={bank}
            initialIndex={sweepInitialIndex}
          />
        )
      })()}

      {screen === 'interim' && report && (
        <InterimScreen
          report={report}
          onPick={handlePickCategory}
          onResults={() => setScreen('results')}
          recommended={recommended}
          bank={bank}
        />
      )}

      {screen === 'category' && session && activeCategory && (
        <QuestionScreen
          questions={drilldownQuestions(bank, activeCategory, drafts)}
          answers={session.answers}
          onAnswer={handleAnswer}
          onDone={handleCategoryDone}
          heading={activeCategoryName}
          bank={bank}
        />
      )}

      {screen === 'results' && (
        <h2>Results</h2>
      )}
    </main>
  )
}
