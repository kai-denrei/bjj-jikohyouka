import { useState, useEffect, useRef } from 'react'
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
  const sessionRef = useRef<AssessmentSession | null>(null)
  const [completedCategories, setCompletedCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [resumeSession, setResumeSession] = useState<AssessmentSession | null>(null)
  const [sweepStartIndex, setSweepStartIndex] = useState(0)

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
    setScreen('intake')
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

      {screen === 'sweep' && session && (
        <QuestionScreen
          questions={sweepQs}
          answers={session.answers}
          onAnswer={handleAnswer}
          onDone={handleSweepDone}
          heading="Sweep"
          bank={bank}
          initialIndex={sweepStartIndex}
        />
      )}

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
