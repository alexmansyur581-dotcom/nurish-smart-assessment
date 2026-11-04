import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import AttemptsLib "../lib/attempts";

mixin (
  accessControlState : AccessControl.AccessControlState,
  assessments : Map.Map<Common.Id, Common.Assessment>,
  questions : Map.Map<Common.Id, Common.Question>,
  attempts : Map.Map<Common.Id, Common.Attempt>,
  nextAttemptId : { var value : Common.Id },
) {
  /// Start or resume an attempt for a student identity via share token.
  public shared ({ caller }) func startAttempt(
    token : Text,
    student : Common.StudentIdentity,
  ) : async ?Common.Attempt {
    let assessment = AttemptsLib.findByToken(assessments, token) ?? return null;
    if (assessment.status != #published) { return null };
    switch (AttemptsLib.findInProgress(attempts, assessment.id, student.participantId, caller)) {
      case (?existing) { return ?existing };
      case null {};
    };
    let used = AttemptsLib.countAttemptsFor(attempts, assessment.id, student.participantId);
    if (used >= assessment.allowedAttempts) { return null };
    ?AttemptsLib.create(attempts, nextAttemptId, assessment.id, caller, student, used + 1);
  };

  /// Save a single answer for an in-progress attempt.
  public shared ({ caller }) func saveAnswer(
    attemptId : Common.Id,
    questionId : Common.Id,
    response : Text,
  ) : async ?Common.Attempt {
    let attempt = attempts.get(attemptId) ?? return null;
    if (not AttemptsLib.canAccess(AccessControl.isAdmin(accessControlState, caller), caller, attempt, assessments.get(attempt.assessmentId))) {
      return null;
    };
    if (attempt.status != #inProgress) { return null };
    let updated = AttemptsLib.upsertAnswer(attempt, questionId, response);
    AttemptsLib.store(attempts, updated);
    ?updated;
  };

  /// Submit an attempt and auto-grade objective questions.
  public shared ({ caller }) func submitAttempt(attemptId : Common.Id) : async ?Common.Attempt {
    let attempt = attempts.get(attemptId) ?? return null;
    if (not AttemptsLib.canAccess(AccessControl.isAdmin(accessControlState, caller), caller, attempt, assessments.get(attempt.assessmentId))) {
      return null;
    };
    if (attempt.status != #inProgress) { return null };
    let graded = AttemptsLib.autoGrade(attempt, questions);
    let submitted : Common.Attempt = {
      graded with
      status = #awaitingReview;
      submittedAt = ?Time.now();
    };
    AttemptsLib.store(attempts, submitted);
    ?submitted;
  };

  /// Grade a manual answer (short answer or essay).
  public shared ({ caller }) func gradeAnswer(
    attemptId : Common.Id,
    questionId : Common.Id,
    awardedScore : Nat,
    comment : ?Text,
  ) : async ?Common.Attempt {
    let attempt = attempts.get(attemptId) ?? return null;
    let assessment = assessments.get(attempt.assessmentId) ?? return null;
    if (not AttemptsLib.canManage(AccessControl.isAdmin(accessControlState, caller), caller, assessment)) {
      return null;
    };
    if (attempt.status == #inProgress) { return null };
    let question = questions.get(questionId) ?? return null;
    if (AttemptsLib.isObjective(question.kind)) { return null };
    if (awardedScore > question.weight) { return null };
    let updated = AttemptsLib.gradeAnswer(attempt, questionId, awardedScore, comment);
    AttemptsLib.store(attempts, updated);
    ?updated;
  };

  /// Attach a mentor note and finalize grading.
  public shared ({ caller }) func finalizeAttempt(
    attemptId : Common.Id,
    mentorNote : ?Text,
  ) : async ?Common.Attempt {
    let attempt = attempts.get(attemptId) ?? return null;
    let assessment = assessments.get(attempt.assessmentId) ?? return null;
    if (not AttemptsLib.canManage(AccessControl.isAdmin(accessControlState, caller), caller, assessment)) {
      return null;
    };
    if (attempt.status == #inProgress) { return null };
    if (not AttemptsLib.allManualGraded(attempt, questions)) { return null };
    let finalized : Common.Attempt = {
      attempt with
      status = #graded;
      mentorNote;
    };
    AttemptsLib.store(attempts, finalized);
    ?finalized;
  };

  /// List attempts for an assessment (admin or owning mentor).
  public query ({ caller }) func listAttempts(assessmentId : Common.Id) : async [Common.Attempt] {
    let assessment = assessments.get(assessmentId) ?? return [];
    if (not AttemptsLib.canManage(AccessControl.isAdmin(accessControlState, caller), caller, assessment)) {
      return [];
    };
    attempts.values().filter(func a = a.assessmentId == assessmentId).toArray();
  };

  /// Read the result summary for a graded attempt.
  public query ({ caller }) func getAttemptResult(attemptId : Common.Id) : async ?Common.AttemptResult {
    let attempt = attempts.get(attemptId) ?? return null;
    if (not AttemptsLib.canAccess(AccessControl.isAdmin(accessControlState, caller), caller, attempt, assessments.get(attempt.assessmentId))) {
      return null;
    };
    if (attempt.status != #graded) { return null };
    ?AttemptsLib.toResult(attempt, questions);
  };
};
