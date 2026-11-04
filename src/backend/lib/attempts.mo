import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Common "../types/common";

module {
  /// Find an assessment by its share token.
  public func findByToken(
    assessments : Map.Map<Common.Id, Common.Assessment>,
    token : Text,
  ) : ?Common.Assessment {
    assessments.values().find(func a = a.shareToken == token);
  };

  /// Count attempts already recorded for an assessment and participant.
  public func countAttemptsFor(
    attempts : Map.Map<Common.Id, Common.Attempt>,
    assessmentId : Common.Id,
    participantId : Text,
  ) : Nat {
    var count = 0;
    for (attempt in attempts.values()) {
      if (attempt.assessmentId == assessmentId and attempt.student.participantId == participantId) {
        count += 1;
      };
    };
    count;
  };

  /// Find the most recent in-progress attempt for a participant owned by the caller.
  public func findInProgress(
    attempts : Map.Map<Common.Id, Common.Attempt>,
    assessmentId : Common.Id,
    participantId : Text,
    owner : Principal,
  ) : ?Common.Attempt {
    var found : ?Common.Attempt = null;
    for (attempt in attempts.values()) {
      if (
        attempt.assessmentId == assessmentId and
        attempt.student.participantId == participantId and
        attempt.owner == owner and
        attempt.status == #inProgress
      ) {
        switch (found) {
          case (?current) {
            if (attempt.id > current.id) { found := ?attempt };
          };
          case null { found := ?attempt };
        };
      };
    };
    found;
  };

  /// Create a fresh in-progress attempt owned by the calling principal.
  public func create(
    attempts : Map.Map<Common.Id, Common.Attempt>,
    nextAttemptId : { var value : Common.Id },
    assessmentId : Common.Id,
    owner : Principal,
    student : Common.StudentIdentity,
    attemptNumber : Nat,
  ) : Common.Attempt {
    let id = nextAttemptId.value;
    nextAttemptId.value := id + 1;
    let attempt : Common.Attempt = {
      id;
      assessmentId;
      owner;
      student;
      attemptNumber;
      status = #inProgress;
      startedAt = Time.now();
      submittedAt = null;
      answers = [];
      mentorNote = null;
    };
    attempts.add(id, attempt);
    attempt;
  };

  /// Replace an attempt in storage.
  public func store(
    attempts : Map.Map<Common.Id, Common.Attempt>,
    attempt : Common.Attempt,
  ) {
    attempts.add(attempt.id, attempt);
  };

  /// Upsert a single answer, preserving any existing grading fields.
  public func upsertAnswer(
    attempt : Common.Attempt,
    questionId : Common.Id,
    response : Text,
  ) : Common.Attempt {
    let existing = attempt.answers.find(func a = a.questionId == questionId);
    let updated : Common.Answer = switch (existing) {
      case (?a) { { a with response } };
      case null {
        { questionId; response; awardedScore = null; mentorComment = null };
      };
    };
    let kept = attempt.answers.filter(func a = a.questionId != questionId);
    { attempt with answers = kept.concat([updated]) };
  };

  /// Update the awarded score and comment for one answer.
  public func gradeAnswer(
    attempt : Common.Attempt,
    questionId : Common.Id,
    awardedScore : Nat,
    comment : ?Text,
  ) : Common.Attempt {
    let updated = attempt.answers.map(
      func a = if (a.questionId == questionId) {
        { a with awardedScore = ?awardedScore; mentorComment = comment };
      } else {
        a;
      }
    );
    { attempt with answers = updated };
  };

  /// Whether a question kind is graded automatically.
  public func isObjective(kind : Common.QuestionKind) : Bool {
    switch (kind) {
      case (#multipleChoice) { true };
      case (#trueFalse) { true };
      case (#shortAnswer) { false };
      case (#essay) { false };
    };
  };

  /// Normalize a response for objective comparison.
  func normalize(text : Text) : Text {
    text.trim(#predicate(func c = c == ' ' or c == '\t' or c == '\n' or c == '\r')).toLower();
  };

  /// Auto-grade objective answers against the answer key.
  public func autoGrade(
    attempt : Common.Attempt,
    questions : Map.Map<Common.Id, Common.Question>,
  ) : Common.Attempt {
    let graded = attempt.answers.map(
      func a = switch (questions.get(a.questionId)) {
        case (?q) {
          if (isObjective(q.kind)) {
            let correct = normalize(a.response) == normalize(q.answerKey);
            { a with awardedScore = ?(if (correct) { q.weight } else { 0 }) };
          } else {
            a;
          };
        };
        case null { a };
      }
    );
    { attempt with answers = graded };
  };

  /// Whether every manual (non-objective) answer has been graded.
  public func allManualGraded(
    attempt : Common.Attempt,
    questions : Map.Map<Common.Id, Common.Question>,
  ) : Bool {
    var complete = true;
    for (a in attempt.answers.values()) {
      switch (questions.get(a.questionId)) {
        case (?q) {
          if (not isObjective(q.kind) and a.awardedScore == null) {
            complete := false;
          };
        };
        case null {};
      };
    };
    complete;
  };

  /// Build the result summary for an attempt.
  public func toResult(
    attempt : Common.Attempt,
    questions : Map.Map<Common.Id, Common.Question>,
  ) : Common.AttemptResult {
    var totalQuestions = 0;
    var correctCount = 0;
    var wrongCount = 0;
    var unansweredCount = 0;
    var objectiveScore = 0;
    var manualScore = 0;
    var totalWeight = 0;

    for (q in questions.values()) {
      if (q.assessmentId == attempt.assessmentId) {
        totalQuestions += 1;
        totalWeight += q.weight;
        switch (attempt.answers.find(func a = a.questionId == q.id)) {
          case (?a) {
            if (a.response.trim(#predicate(func c = c == ' ' or c == '\t' or c == '\n' or c == '\r')) == "") {
              unansweredCount += 1;
            } else if (isObjective(q.kind)) {
              let awarded = a.awardedScore ?? 0;
              objectiveScore += awarded;
              if (awarded > 0) { correctCount += 1 } else { wrongCount += 1 };
            } else {
              manualScore += a.awardedScore ?? 0;
            };
          };
          case null { unansweredCount += 1 };
        };
      };
    };

    let finalScore = if (totalWeight == 0) { 0 } else {
      ((objectiveScore + manualScore) * 100) / totalWeight;
    };

    {
      attemptId = attempt.id;
      assessmentId = attempt.assessmentId;
      student = attempt.student;
      status = attempt.status;
      submittedAt = attempt.submittedAt;
      totalQuestions;
      correctCount;
      wrongCount;
      unansweredCount;
      objectiveScore;
      manualScore;
      finalScore;
      mentorNote = attempt.mentorNote;
    };
  };

  /// Whether the caller may manage an assessment (admin or its owner).
  public func canManage(
    isAdmin : Bool,
    caller : Principal,
    assessment : Common.Assessment,
  ) : Bool {
    isAdmin or assessment.owner == caller;
  };

  /// Whether the caller owns the attempt (the student who created it).
  public func isOwner(caller : Principal, attempt : Common.Attempt) : Bool {
    attempt.owner == caller;
  };

  /// Whether the caller may read or change an attempt: its owning student,
  /// or an admin / the mentor who owns the attempt's assessment.
  public func canAccess(
    isAdmin : Bool,
    caller : Principal,
    attempt : Common.Attempt,
    assessment : ?Common.Assessment,
  ) : Bool {
    if (isOwner(caller, attempt)) { return true };
    switch (assessment) {
      case (?a) { canManage(isAdmin, caller, a) };
      case null { false };
    };
  };
};
