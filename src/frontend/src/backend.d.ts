import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Answer {
    mentorComment?: string;
    awardedScore?: bigint;
    response: string;
    questionId: Id;
}
export interface AssessmentView {
    id: Id;
    status: AssessmentStatus;
    title: string;
    subject: string;
    owner: Principal;
    createdAt: Timestamp;
    shareToken: string;
    className: string;
    allowedAttempts: bigint;
    educationLevel: EducationLevel;
    material: string;
}
export interface Attempt {
    id: Id;
    status: AttemptStatus;
    startedAt: Timestamp;
    owner: Principal;
    answers: Array<Answer>;
    submittedAt?: Timestamp;
    student: StudentIdentity;
    mentorNote?: string;
    assessmentId: Id;
    attemptNumber: bigint;
}
export interface AttemptResult {
    status: AttemptStatus;
    wrongCount: bigint;
    attemptId: Id;
    objectiveScore: bigint;
    submittedAt?: Timestamp;
    manualScore: bigint;
    totalQuestions: bigint;
    unansweredCount: bigint;
    student: StudentIdentity;
    finalScore: bigint;
    mentorNote?: string;
    correctCount: bigint;
    assessmentId: Id;
}
export interface Cell {
    value: Value;
    name: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type Id = bigint;
export interface MentorView {
    id: Id;
    displayName: string;
    createdAt: Timestamp;
    isActive: boolean;
    email: string;
}
export interface Question {
    id: Id;
    weight: bigint;
    answerKey: string;
    kind: QuestionKind;
    text: string;
    number: bigint;
    assessmentId: Id;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface StudentIdentity {
    fullName: string;
    participantId: string;
    className: string;
    educationLevel: EducationLevel;
    schoolName: string;
}
export interface StudentQuestion {
    id: Id;
    weight: bigint;
    kind: QuestionKind;
    text: string;
    number: bigint;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
}
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum AssessmentStatus {
    closed = "closed",
    published = "published",
    draft = "draft"
}
export enum AttemptStatus {
    graded = "graded",
    awaitingReview = "awaitingReview",
    inProgress = "inProgress"
}
export enum EducationLevel {
    smpMts = "smpMts",
    sdMi = "sdMi"
}
export enum QuestionKind {
    shortAnswer = "shortAnswer",
    essay = "essay",
    multipleChoice = "multipleChoice",
    trueFalse = "trueFalse"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Close an assessment (admin or owning mentor).
     */
    closeAssessment(id: Id): Promise<AssessmentView | null>;
    /**
     * / Create a new draft assessment owned by the caller.
     */
    createAssessment(title: string, educationLevel: EducationLevel, className: string, subject: string, material: string, allowedAttempts: bigint): Promise<AssessmentView>;
    /**
     * / Create a mentor account (admin only).
     */
    createMentor(email: string, password: string, displayName: string): Promise<MentorView>;
    /**
     * / Delete an assessment and its questions (admin or owning mentor).
     */
    deleteAssessment(id: Id): Promise<boolean>;
    /**
     * / Delete a mentor account (admin only).
     */
    deleteMentor(id: Id): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Attach a mentor note and finalize grading.
     */
    finalizeAttempt(attemptId: Id, mentorNote: string | null): Promise<Attempt | null>;
    getApiDoc(): Promise<string>;
    /**
     * / Read an assessment and its questions by share token (student access).
     * / The returned questions never include the answer key.
     */
    getAssessmentByToken(token: string): Promise<[AssessmentView, Array<StudentQuestion>] | null>;
    /**
     * / Read the result summary for a graded attempt.
     */
    getAttemptResult(attemptId: Id): Promise<AttemptResult | null>;
    /**
     * / Return the mentor account bound to the caller, if any.
     */
    getCallerMentor(): Promise<MentorView | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Grade a manual answer (short answer or essay).
     */
    gradeAnswer(attemptId: Id, questionId: Id, awardedScore: bigint, comment: string | null): Promise<Attempt | null>;
    /**
     * / Report whether the caller has already unlocked the application.
     */
    isAppUnlocked(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / List assessments visible to the caller: admins see all, mentors their own.
     */
    listAssessments(): Promise<Array<AssessmentView>>;
    /**
     * / List attempts for an assessment (admin or owning mentor).
     */
    listAttempts(assessmentId: Id): Promise<Array<Attempt>>;
    /**
     * / List every mentor account (admin only).
     */
    listMentors(): Promise<Array<MentorView>>;
    /**
     * / Sign in a mentor with email and password.
     */
    mentorLogin(email: string, password: string): Promise<MentorView | null>;
    /**
     * / Publish an assessment and return its share token (admin or owning mentor).
     */
    publishAssessment(id: Id): Promise<string | null>;
    /**
     * / Save a single answer for an in-progress attempt.
     */
    saveAnswer(attemptId: Id, questionId: Id, response: string): Promise<Attempt | null>;
    schema(): Promise<string>;
    /**
     * / Activate or deactivate a mentor account (admin only).
     */
    setMentorActive(id: Id, isActive: boolean): Promise<MentorView | null>;
    /**
     * / Start or resume an attempt for a student identity via share token.
     */
    startAttempt(token: string, student: StudentIdentity): Promise<Attempt | null>;
    /**
     * / Submit an attempt and auto-grade objective questions.
     */
    submitAttempt(attemptId: Id): Promise<Attempt | null>;
    /**
     * / Verify the shared application password and open the gate for the caller.
     */
    unlockApp(password: string): Promise<boolean>;
    /**
     * / Update an assessment's metadata (admin or owning mentor).
     */
    updateAssessment(id: Id, title: string, educationLevel: EducationLevel, className: string, subject: string, material: string, allowedAttempts: bigint): Promise<AssessmentView | null>;
    /**
     * / Upload and validate questions for an assessment. Stores nothing when any
     * / row is invalid; traps with the per-row failures instead.
     */
    uploadQuestions(assessmentId: Id, parsed: Array<Question>): Promise<bigint>;
}
