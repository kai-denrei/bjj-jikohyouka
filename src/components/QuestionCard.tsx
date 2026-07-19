import type { Question } from '../lib/bank/schema'

export interface QuestionCardProps {
  question: Question
}

export function QuestionCard({ question }: QuestionCardProps) {
  // If no slots, render legacy behavior: just the full text as an h2
  if (!question.slots) {
    return <h2 style={{ margin: 0 }}>{question.text}</h2>
  }

  const { who, what, problem } = question.slots

  return (
    <div>
      <div className="mono" style={{ fontSize: 14, marginBottom: 12 }}>
        vs {who.toUpperCase()}
      </div>
      <h2 style={{ margin: '0 0 12px 0' }}>
        {what.charAt(0).toUpperCase() + what.slice(1)}
      </h2>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        {problem}
      </p>
    </div>
  )
}
