import { QuizQuestionType } from "@prisma/client"

export type GradeQuestion = {
  id: string
  type: QuizQuestionType
  correctAnswers: unknown
  points: number
}

export type QuizAnswer = {
  questionId: string
  answer: string | string[]
}

function normalize(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).sort()
  if (typeof value === "string") return [value]
  return []
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

export function gradeQuizAttempt(questions: GradeQuestion[], answers: QuizAnswer[]) {
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]))
  const maxScore = questions.reduce((sum, question) => sum + question.points, 0)
  let score = 0

  const results = questions.map((question) => {
    const expected = normalize(question.correctAnswers)
    const submitted = normalize(answerMap.get(question.id))
    const correct =
      question.type === QuizQuestionType.SINGLE_CHOICE
        ? submitted.length === 1 && submitted[0] === expected[0]
        : sameSet(submitted, expected)

    if (correct) score += question.points

    return {
      questionId: question.id,
      correct,
      earned: correct ? question.points : 0,
      points: question.points,
    }
  })

  return { score, maxScore, results }
}
