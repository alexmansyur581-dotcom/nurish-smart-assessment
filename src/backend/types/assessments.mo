import Common "common";

module {
  /// A question belonging to an assessment.
  public type Question = {
    id : Common.Id;
    assessmentId : Common.Id;
    number : Nat;
    kind : Common.QuestionKind;
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
    id : Common.Id;
    owner : Principal;
    title : Text;
    educationLevel : Common.EducationLevel;
    className : Text;
    subject : Text;
    material : Text;
    status : Common.AssessmentStatus;
    createdAt : Common.Timestamp;
    shareToken : Text;
    allowedAttempts : Nat;
  };

  /// Public view of an assessment.
  public type AssessmentView = {
    id : Common.Id;
    owner : Principal;
    title : Text;
    educationLevel : Common.EducationLevel;
    className : Text;
    subject : Text;
    material : Text;
    status : Common.AssessmentStatus;
    createdAt : Common.Timestamp;
    shareToken : Text;
    allowedAttempts : Nat;
  };

  /// A question as shown to a student (no answer key).
  public type StudentQuestion = {
    id : Common.Id;
    number : Nat;
    kind : Common.QuestionKind;
    text : Text;
    optionA : ?Text;
    optionB : ?Text;
    optionC : ?Text;
    optionD : ?Text;
    weight : Nat;
  };
};
