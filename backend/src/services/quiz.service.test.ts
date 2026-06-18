import { QuizQuestionType } from "@prisma/client"
import { describe, expect, it } from "vitest"
import { gradeQuizAttempt } from "./quiz.service"

describe("quiz grading logic", () => {
  it("grades single and multiple choice questions exactly", () => {
    const result = gradeQuizAttempt(
      [
        {
          id: "q1",
          type: QuizQuestionType.SINGLE_CHOICE,
          correctAnswers: ["A"],
          points: 1,
        },
        {
          id: "q2",
          type: QuizQuestionType.MULTIPLE_CHOICE,
          correctAnswers: ["B", "C"],
          points: 2,
        },
      ],
      [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: ["C", "B"] },
      ],
    )

    expect(result.score).toBe(3)
    expect(result.maxScore).toBe(3)
    expect(result.results.every((item) => item.correct)).toBe(true)
  })

  it("does not award partial points for incomplete multiple choice answers", () => {
    const result = gradeQuizAttempt(
      [
        {
          id: "q1",
          type: QuizQuestionType.MULTIPLE_CHOICE,
          correctAnswers: ["A", "C"],
          points: 2,
        },
      ],
      [{ questionId: "q1", answer: ["A"] }],
    )

    expect(result.score).toBe(0)
    expect(result.results[0]).toMatchObject({ correct: false, earned: 0 })
  })
})
