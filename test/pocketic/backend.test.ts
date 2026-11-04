import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const admin = createIdentity("admin");
const mentorA = createIdentity("mentor-a");
const mentorB = createIdentity("mentor-b");
const student = createIdentity("student");

function actorFor(identity: ReturnType<typeof createIdentity>): Actor<_SERVICE> {
  const actor = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  actor.setIdentity(identity);
  return actor;
}

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  });
  canisterId = installed.canisterId;
  // The first initialized caller becomes administrator; later callers register
  // through their own initializer, exactly as sign-in does.
  await registerCaller(actorFor(admin), admin);
  await registerCaller(actorFor(mentorA), mentorA);
  await registerCaller(actorFor(mentorB), mentorB);
  // Students have no account, but the access-control layer still requires the
  // caller to be initialized before guarded attempt calls are accepted.
  await registerCaller(actorFor(student), student);
});

afterAll(async () => {
  await pic?.tearDown();
});

describe("password gate", () => {
  it("rejects a wrong password and accepts the shared one", async () => {
    const guest = actorFor(student);
    await expect(guest.unlockApp("salah")).resolves.toBe(false);
    await expect(guest.isAppUnlocked()).resolves.toBe(false);
    await expect(guest.unlockApp("B4kung4n")).resolves.toBe(true);
    await expect(guest.isAppUnlocked()).resolves.toBe(true);
  });
});

describe("mentor accounts and assessment ownership", () => {
  it("lets an admin create a mentor and sign that mentor in", async () => {
    const adminActor = actorFor(admin);
    const created = await adminActor.createMentor(
      "guru@example.com",
      "rahasia123",
      "Guru Satu",
    );
    expect(created.email).toBe("guru@example.com");

    const loginActor = actorFor(mentorA);
    const loggedIn = await loginActor.mentorLogin(
      "guru@example.com",
      "rahasia123",
    );
    expect(loggedIn?.[0]?.displayName).toBe("Guru Satu");
  });

  it("shows a mentor only their own assessments while an admin sees all", async () => {
    const a = actorFor(mentorA);
    const b = actorFor(mentorB);
    const createdA = await a.createAssessment(
      "Asesmen A",
      { sdMi: null },
      "6A",
      "Matematika",
      "Pecahan",
      1n,
    );
    await b.createAssessment(
      "Asesmen B",
      { sdMi: null },
      "6B",
      "IPA",
      "Fotosintesis",
      1n,
    );

    const listA = await a.listAssessments();
    expect(listA.map((x) => x.title)).toEqual(["Asesmen A"]);
    expect(listA[0].id).toBe(createdA.id);

    const adminList = await actorFor(admin).listAssessments();
    expect(adminList.map((x) => x.title).sort()).toEqual([
      "Asesmen A",
      "Asesmen B",
    ]);
  });

  it("rejects a mentor trying to publish another mentor's assessment", async () => {
    const a = actorFor(mentorA);
    const created = await a.createAssessment(
      "Milik A",
      { sdMi: null },
      "6A",
      "Matematika",
      "Pecahan",
      1n,
    );
    await expect(
      actorFor(mentorB).publishAssessment(created.id),
    ).rejects.toThrow();
  });
});

describe("student attempt flow", () => {
  async function publishAssessmentWithQuestions() {
    const mentor = actorFor(mentorA);
    const assessment = await mentor.createAssessment(
      "Ulangan Fotosintesis",
      { sdMi: null },
      "6A",
      "IPA",
      "Fotosintesis",
      1n,
    );
    await mentor.uploadQuestions(assessment.id, [
      {
        id: 0n,
        assessmentId: assessment.id,
        number: 1n,
        kind: { multipleChoice: null },
        text: "Gas yang dihasilkan?",
        optionA: ["Oksigen"],
        optionB: ["Karbon dioksida"],
        optionC: ["Nitrogen"],
        optionD: ["Helium"],
        answerKey: "A",
        weight: 1n,
      },
      {
        id: 0n,
        assessmentId: assessment.id,
        number: 2n,
        kind: { essay: null },
        text: "Jelaskan proses fotosintesis.",
        optionA: [],
        optionB: [],
        optionC: [],
        optionD: [],
        answerKey: "Klorofil menyerap cahaya",
        weight: 3n,
      },
    ]);
    const token = await mentor.publishAssessment(assessment.id);
    return { assessment, token: token?.[0] ?? "" };
  }

  it("hides the answer key from the student question payload", async () => {
    const { token } = await publishAssessmentWithQuestions();
    const read = await actorFor(student).getAssessmentByToken(token);
    expect(read).not.toBeNull();
    const questions = read?.[0]?.[1] ?? [];
    expect(questions).toHaveLength(2);
    for (const q of questions) {
      expect(q).not.toHaveProperty("answerKey");
    }
  });

  it("autosaves an answer and restores it on resume", async () => {
    const { token } = await publishAssessmentWithQuestions();
    const studentActor = actorFor(student);
    const identity = {
      fullName: "Aisyah",
      educationLevel: { sdMi: null } as const,
      className: "6A",
      schoolName: "SDN 1",
      participantId: "2024-001",
    };
    const started = await studentActor.startAttempt(token, identity);
    const attemptId = started?.[0]?.id;
    expect(attemptId).toBeDefined();

    const read = await studentActor.getAssessmentByToken(token);
    const firstQuestionId = read?.[0]?.[1]?.[0]?.id;
    expect(firstQuestionId).toBeDefined();

    await studentActor.saveAnswer(attemptId!, firstQuestionId!, "A");

    const resumed = await studentActor.startAttempt(token, identity);
    const saved = resumed?.[0]?.answers.find(
      (a) => a.questionId === firstQuestionId,
    );
    expect(saved?.response).toBe("A");
  });

  it("auto-grades objective answers and computes the final score", async () => {
    const { token } = await publishAssessmentWithQuestions();
    const studentActor = actorFor(student);
    const identity = {
      fullName: "Budi",
      educationLevel: { sdMi: null } as const,
      className: "6A",
      schoolName: "SDN 1",
      participantId: "2024-002",
    };
    const started = await studentActor.startAttempt(token, identity);
    const attemptId = started?.[0]?.id;
    const read = await studentActor.getAssessmentByToken(token);
    const questions = read?.[0]?.[1] ?? [];
    const mc = questions.find((q) => "multipleChoice" in q.kind);
    const essay = questions.find((q) => "essay" in q.kind);

    await studentActor.saveAnswer(attemptId!, mc!.id, "A");
    await studentActor.saveAnswer(attemptId!, essay!.id, "Klorofil");
    await studentActor.submitAttempt(attemptId!);

    // Manual grading is required before the result is visible.
    // `@dfinity/pic` decodes an absent optional as `[]`, not `null`.
    await expect(
      studentActor.getAttemptResult(attemptId!),
    ).resolves.toEqual([]);

    const mentor = actorFor(mentorA);
    // The declarations shape an optional as `[] | [T]`.
    await mentor.gradeAnswer(attemptId!, essay!.id, 3n, ["Bagus"]);
    await mentor.finalizeAttempt(attemptId!, ["Pertahankan"]);

    const result = await studentActor.getAttemptResult(attemptId!);
    expect(result).not.toBeNull();
    // (objective 1 + manual 3) / total weight 4 * 100 = 100
    expect(result?.[0]?.finalScore).toBe(100n);
    expect(result?.[0]?.correctCount).toBe(1n);
  });

  it("does not let one student read another student's attempt", async () => {
    const { token } = await publishAssessmentWithQuestions();
    const owner = actorFor(student);
    const identity = {
      fullName: "Citra",
      educationLevel: { sdMi: null } as const,
      className: "6A",
      schoolName: "SDN 1",
      participantId: "2024-003",
    };
    const started = await owner.startAttempt(token, identity);
    const attemptId = started?.[0]?.id;

    const otherIdentity = createIdentity("student-other");
    const other = await registerCaller(actorFor(otherIdentity), otherIdentity);
    // `@dfinity/pic` decodes an absent optional as `[]`, not `null`.
    await expect(other.saveAnswer(attemptId!, 1n, "A")).resolves.toEqual([]);
    await expect(other.submitAttempt(attemptId!)).resolves.toEqual([]);
  });
});
