module {
  /// Signed nanosecond timestamp from `Time.now()`.
  public type Timestamp = Int;

  /// Monotonic identifier for assessments, questions, attempts, and answers.
  public type Id = Nat;

  /// Education level of an assessment or student.
  public type EducationLevel = {
    #sdMi;
    #smpMts;
  };

  /// Lifecycle status of an assessment.
  public type AssessmentStatus = {
    #draft;
    #published;
    #closed;
  };

  /// Supported question kinds.
  public type QuestionKind = {
    #multipleChoice;
    #trueFalse;
    #shortAnswer;
    #essay;
  };

  /// Lifecycle status of a student attempt.
  public type AttemptStatus = {
    #inProgress;
    #awaitingReview;
    #graded;
  };

  /// Student identity captured before an attempt starts.
  public type StudentIdentity = {
    fullName : Text;
    educationLevel : EducationLevel;
    className : Text;
    schoolName : Text;
    participantId : Text;
  };

  /// Generic failure a caller can act on.
  public type ApiError = {
    #notFound;
    #unauthorized;
    #invalidInput : Text;
    #conflict : Text;
  };

  // --- Accounts ---

  /// A mentor account managed by an admin.
  public type MentorAccount = {
    id : Id;
    email : Text;
    passwordHash : Text;
    displayName : Text;
    isActive : Bool;
    createdAt : Timestamp;
  };

  /// Public view of a mentor account (no password material).
  public type MentorView = {
    id : Id;
    email : Text;
    displayName : Text;
    isActive : Bool;
    createdAt : Timestamp;
  };

  // --- Assessments ---

  /// A question belonging to an assessment.
  public type Question = {
    id : Id;
    assessmentId : Id;
    number : Nat;
    kind : QuestionKind;
    text : Text;
    optionA : ?Text;
    optionB : ?Text;
    optionC : ?Text;
    optionD : ?Text;
    answerKey : Text;
    weight : Nat;
  };

  /// An assessment created by a mentor.
  public type Assessment = {
    id : Id;
    owner : Principal;
    title : Text;
    educationLevel : EducationLevel;
    className : Text;
    subject : Text;
    material : Text;
    status : AssessmentStatus;
    createdAt : Timestamp;
    shareToken : Text;
    allowedAttempts : Nat;
  };

  /// Public view of an assessment.
  public type AssessmentView = {
    id : Id;
    owner : Principal;
    title : Text;
    educationLevel : EducationLevel;
    className : Text;
    subject : Text;
    material : Text;
    status : AssessmentStatus;
    createdAt : Timestamp;
    shareToken : Text;
    allowedAttempts : Nat;
  };

  /// A question as shown to a student (no answer key).
  public type StudentQuestion = {
    id : Id;
    number : Nat;
    kind : QuestionKind;
    text : Text;
    optionA : ?Text;
    optionB : ?Text;
    optionC : ?Text;
    optionD : ?Text;
    weight : Nat;
  };

  // --- Attempts ---

  /// A single answer within a student attempt.
  public type Answer = {
    questionId : Id;
    response : Text;
    awardedScore : ?Nat;
    mentorComment : ?Text;
  };

  /// A student attempt at an assessment.
  public type Attempt = {
    id : Id;
    assessmentId : Id;
    /// Principal that created the attempt; the only proof of student ownership.
    owner : Principal;
    student : StudentIdentity;
    attemptNumber : Nat;
    status : AttemptStatus;
    startedAt : Timestamp;
    submittedAt : ?Timestamp;
    answers : [Answer];
    mentorNote : ?Text;
  };

  /// Result summary for a graded attempt.
  public type AttemptResult = {
    attemptId : Id;
    assessmentId : Id;
    student : StudentIdentity;
    status : AttemptStatus;
    submittedAt : ?Timestamp;
    totalQuestions : Nat;
    correctCount : Nat;
    wrongCount : Nat;
    unansweredCount : Nat;
    objectiveScore : Nat;
    manualScore : Nat;
    finalScore : Nat;
    mentorNote : ?Text;
  };
};
