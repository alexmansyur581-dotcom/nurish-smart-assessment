import { renderWithActor } from "@/__tests__/test-utils";
import type { Attempt, StudentQuestion, backendInterface } from "@/backend";
import { AttemptStatus, EducationLevel, QuestionKind } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentExamPage from "./StudentExamPage";

const TOKEN = "asm-1-42";
const ATTEMPT_ID = 7n;
const IDENTITY_KEY = `nurish-smart-student-identity:${TOKEN}`;

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ token: TOKEN, attemptId: ATTEMPT_ID.toString() }),
  };
});

const questions: StudentQuestion[] = [
  {
    id: 1n,
    number: 1n,
    kind: QuestionKind.multipleChoice,
    text: "Ibu kota Indonesia?",
    optionA: "Jakarta",
    optionB: "Bandung",
    optionC: "Surabaya",
    optionD: "Medan",
    weight: 1n,
  },
  {
    id: 2n,
    number: 2n,
    kind: QuestionKind.essay,
    text: "Jelaskan proses fotosintesis.",
    weight: 2n,
  },
];

function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: ATTEMPT_ID,
    assessmentId: 1n,
    owner: { toText: () => "student" } as unknown as Attempt["owner"],
    student: {
      fullName: "Aisyah",
      educationLevel: EducationLevel.sdMi,
      className: "6A",
      schoolName: "SDN 1",
      participantId: "2024-001",
    },
    attemptNumber: 1n,
    status: AttemptStatus.inProgress,
    startedAt: 1n,
    answers: [],
    ...overrides,
  };
}

function makeActor(attempt: Attempt) {
  const getAssessmentByToken =
    vi.fn<backendInterface["getAssessmentByToken"]>();
  const startAttempt = vi.fn<backendInterface["startAttempt"]>();
  const saveAnswer = vi.fn<backendInterface["saveAnswer"]>();
  const submitAttempt = vi.fn<backendInterface["submitAttempt"]>();

  getAssessmentByToken.mockResolvedValue([
    {
      id: 1n,
      status: "published" as never,
      title: "Ulangan Matematika",
      subject: "Matematika",
      owner: { toText: () => "mentor" } as never,
      createdAt: 1n,
      shareToken: TOKEN,
      className: "6A",
      allowedAttempts: 1n,
      educationLevel: EducationLevel.sdMi,
      material: "Pecahan",
    },
    questions,
  ]);
  startAttempt.mockResolvedValue(attempt);
  saveAnswer.mockImplementation(async () => attempt);
  submitAttempt.mockResolvedValue({
    ...attempt,
    status: AttemptStatus.awaitingReview,
  });

  return {
    actor: {
      getAssessmentByToken,
      startAttempt,
      saveAnswer,
      submitAttempt,
    } satisfies Pick<
      backendInterface,
      "getAssessmentByToken" | "startAttempt" | "saveAnswer" | "submitAttempt"
    >,
    getAssessmentByToken,
    startAttempt,
    saveAnswer,
    submitAttempt,
  };
}

describe("StudentExamPage", () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockClear();
    localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({
        fullName: "Aisyah",
        educationLevel: EducationLevel.sdMi,
        className: "6A",
        schoolName: "SDN 1",
        participantId: "2024-001",
      }),
    );
  });

  it("restores previously saved answers after a reload", async () => {
    const attempt = makeAttempt({
      answers: [{ questionId: 1n, response: "A" }],
    });
    const { actor } = makeActor(attempt);

    renderWithActor(<StudentExamPage />, actor);

    expect(await screen.findByText("Ibu kota Indonesia?")).toBeInTheDocument();
    expect(screen.getByTestId("student_exam.option_a")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("student_exam.progress_label")).toHaveTextContent(
      "1 / 2 terjawab",
    );
  });

  it("autosaves a selected answer to the backend", async () => {
    const user = userEvent.setup();
    const attempt = makeAttempt();
    const { actor, saveAnswer } = makeActor(attempt);

    renderWithActor(<StudentExamPage />, actor);

    await screen.findByText("Ibu kota Indonesia?");
    await user.click(screen.getByTestId("student_exam.option_b"));

    await waitFor(() =>
      expect(saveAnswer).toHaveBeenCalledWith(ATTEMPT_ID, 1n, "B"),
    );
    expect(
      await screen.findByTestId("student_exam.save_state"),
    ).toHaveTextContent("Jawaban tersimpan");
  });

  it("locks the exam and navigates to the result after submitting", async () => {
    const user = userEvent.setup();
    const attempt = makeAttempt();
    const { actor, submitAttempt } = makeActor(attempt);

    renderWithActor(<StudentExamPage />, actor);

    await screen.findByText("Ibu kota Indonesia?");
    await user.click(screen.getByTestId("student_exam.next_button"));
    await user.click(screen.getByTestId("student_exam.submit_button"));

    await user.click(await screen.findByTestId("student_exam.confirm_button"));

    await waitFor(() => expect(submitAttempt).toHaveBeenCalledWith(ATTEMPT_ID));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/exam/$token/result/$attemptId",
        }),
      ),
    );
  });
});
