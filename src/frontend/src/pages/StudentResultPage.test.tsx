import { renderWithActor } from "@/__tests__/test-utils";
import type { AttemptResult, backendInterface } from "@/backend";
import { AttemptStatus, EducationLevel } from "@/backend";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentResultPage from "./StudentResultPage";

const ATTEMPT_ID = 7n;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ token: "asm-1-42", attemptId: ATTEMPT_ID.toString() }),
  };
});

function makeResult(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    status: AttemptStatus.graded,
    wrongCount: 1n,
    attemptId: ATTEMPT_ID,
    objectiveScore: 1n,
    manualScore: 3n,
    totalQuestions: 2n,
    unansweredCount: 0n,
    student: {
      fullName: "Aisyah",
      educationLevel: EducationLevel.sdMi,
      className: "6A",
      schoolName: "SDN 1",
      participantId: "2024-001",
    },
    finalScore: 100n,
    correctCount: 1n,
    assessmentId: 1n,
    ...overrides,
  };
}

function makeActor(result: AttemptResult | null) {
  const getAttemptResult = vi.fn<backendInterface["getAttemptResult"]>();
  getAttemptResult.mockResolvedValue(result);
  return {
    actor: { getAttemptResult } satisfies Pick<
      backendInterface,
      "getAttemptResult"
    >,
    getAttemptResult,
  };
}

describe("StudentResultPage", () => {
  it("hides the final score until every manual grade is complete", async () => {
    const { actor } = makeActor(
      makeResult({ status: AttemptStatus.awaitingReview }),
    );

    renderWithActor(<StudentResultPage />, actor);

    expect(
      await screen.findByTestId("student_result.pending_state"),
    ).toHaveTextContent("Menunggu Pemeriksaan");
    expect(
      screen.queryByTestId("student_result.score_card"),
    ).not.toBeInTheDocument();
  });

  it("shows the final score once the attempt is graded", async () => {
    const { actor } = makeActor(makeResult());

    renderWithActor(<StudentResultPage />, actor);

    const scoreCard = await screen.findByTestId("student_result.score_card");
    expect(scoreCard).toHaveTextContent("100");
    expect(screen.getByTestId("student_result.stat_benar")).toHaveTextContent(
      "1",
    );
    expect(screen.getByTestId("student_result.stat_salah")).toHaveTextContent(
      "1",
    );
  });

  it("shows an error state when the result is unavailable", async () => {
    const { actor } = makeActor(null);

    renderWithActor(<StudentResultPage />, actor);

    expect(
      await screen.findByTestId("student_result.error_state"),
    ).toBeInTheDocument();
  });
});
