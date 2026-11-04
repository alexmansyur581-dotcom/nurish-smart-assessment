import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import AssessmentsLib "../lib/assessments";

mixin (
  accessControlState : AccessControl.AccessControlState,
  assessments : Map.Map<Common.Id, Common.Assessment>,
  questions : Map.Map<Common.Id, Common.Question>,
  nextAssessmentId : { var value : Common.Id },
  nextQuestionId : { var value : Common.Id },
) {
  /// List assessments visible to the caller: admins see all, mentors their own.
  public query ({ caller }) func listAssessments() : async [Common.AssessmentView] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let visible = assessments.values().toArray().filter(
      func a = AssessmentsLib.canManage(isAdmin, caller, a)
    );
    visible.map(func a = AssessmentsLib.toView(a));
  };

  /// Create a new draft assessment owned by the caller.
  public shared ({ caller }) func createAssessment(
    title : Text,
    educationLevel : Common.EducationLevel,
    className : Text,
    subject : Text,
    material : Text,
    allowedAttempts : Nat,
  ) : async Common.AssessmentView {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in mentors can create assessments");
    };
    let assessment = AssessmentsLib.create(
      assessments,
      nextAssessmentId,
      caller,
      title,
      educationLevel,
      className,
      subject,
      material,
      allowedAttempts,
    );
    AssessmentsLib.toView(assessment);
  };

  /// Update an assessment's metadata (admin or owning mentor).
  public shared ({ caller }) func updateAssessment(
    id : Common.Id,
    title : Text,
    educationLevel : Common.EducationLevel,
    className : Text,
    subject : Text,
    material : Text,
    allowedAttempts : Nat,
  ) : async ?Common.AssessmentView {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    switch (assessments.get(id)) {
      case null { null };
      case (?a) {
        if (not AssessmentsLib.canManage(isAdmin, caller, a)) {
          Runtime.trap("Unauthorized: You can only change your own assessments");
        };
        switch (AssessmentsLib.update(assessments, id, title, educationLevel, className, subject, material, allowedAttempts)) {
          case null { null };
          case (?updated) { ?AssessmentsLib.toView(updated) };
        };
      };
    };
  };

  /// Upload and validate questions for an assessment. Stores nothing when any
  /// row is invalid; traps with the per-row failures instead.
  public shared ({ caller }) func uploadQuestions(
    assessmentId : Common.Id,
    parsed : [Common.Question],
  ) : async Nat {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let assessment = switch (assessments.get(assessmentId)) {
      case null { Runtime.trap("Assessment not found") };
      case (?a) { a };
    };
    if (not AssessmentsLib.canManage(isAdmin, caller, assessment)) {
      Runtime.trap("Unauthorized: You can only change your own assessments");
    };
    let errors = AssessmentsLib.validateRows(parsed);
    if (errors.size() > 0) {
      Runtime.trap("Validasi soal gagal: " # AssessmentsLib.formatErrors(errors));
    };
    AssessmentsLib.replaceQuestions(questions, nextQuestionId, assessmentId, parsed);
  };

  /// Publish an assessment and return its share token (admin or owning mentor).
  public shared ({ caller }) func publishAssessment(id : Common.Id) : async ?Text {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    switch (assessments.get(id)) {
      case null { null };
      case (?a) {
        if (not AssessmentsLib.canManage(isAdmin, caller, a)) {
          Runtime.trap("Unauthorized: You can only publish your own assessments");
        };
        switch (AssessmentsLib.publish(assessments, id)) {
          case null { null };
          case (?published) { ?published.shareToken };
        };
      };
    };
  };

  /// Close an assessment (admin or owning mentor).
  public shared ({ caller }) func closeAssessment(id : Common.Id) : async ?Common.AssessmentView {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    switch (assessments.get(id)) {
      case null { null };
      case (?a) {
        if (not AssessmentsLib.canManage(isAdmin, caller, a)) {
          Runtime.trap("Unauthorized: You can only close your own assessments");
        };
        switch (AssessmentsLib.close(assessments, id)) {
          case null { null };
          case (?closed) { ?AssessmentsLib.toView(closed) };
        };
      };
    };
  };

  /// Delete an assessment and its questions (admin or owning mentor).
  public shared ({ caller }) func deleteAssessment(id : Common.Id) : async Bool {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    switch (assessments.get(id)) {
      case null { false };
      case (?a) {
        if (not AssessmentsLib.canManage(isAdmin, caller, a)) {
          Runtime.trap("Unauthorized: You can only delete your own assessments");
        };
        AssessmentsLib.remove(assessments, questions, id);
      };
    };
  };

  /// Read an assessment and its questions by share token (student access).
  /// The returned questions never include the answer key.
  public query func getAssessmentByToken(token : Text) : async ?(Common.AssessmentView, [Common.StudentQuestion]) {
    switch (AssessmentsLib.findByToken(assessments, token)) {
      case null { null };
      case (?a) {
        let studentQuestions = AssessmentsLib.questionsFor(questions, a.id).map(
          func q = AssessmentsLib.toStudentQuestion(q)
        );
        ?(AssessmentsLib.toView(a), studentQuestions);
      };
    };
  };
};
