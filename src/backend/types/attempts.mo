import Common "common";

module {
  /// A single answer within a student attempt.
  public type Answer = {
    questionId : Common.Id;
    response : Text;
    awardedScore : ?Nat;
    mentorComment : ?Text;
  };

  /// A student attempt at an assessment.
  public type Attempt = {
    id : Common.Id;
    assessmentId : Common.Id;
    student : Common.StudentIdentity;
    attemptNumber : Nat;
    status : Common.AttemptStatus;
    startedAt : Common.Timestamp;
    submittedAt : ?Common.Timestamp;
    answers : [Answer];
    mentorNote : ?Text;
  };

  /// Result summary for a graded attempt.
  public type AttemptResult = {
    attemptId : Common.Id;
    assessmentId : Common.Id;
    student : Common.StudentIdentity;
    status : Common.AttemptStatus;
    submittedAt : ?Common.Timestamp;
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
