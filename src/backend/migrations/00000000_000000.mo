import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  public type OldActor = {};

  type MentorAccount = {
    id : Nat;
    email : Text;
    passwordHash : Text;
    displayName : Text;
    isActive : Bool;
    createdAt : Int;
  };

  type Assessment = {
    id : Nat;
    owner : Principal;
    title : Text;
    educationLevel : { #sdMi; #smpMts };
    className : Text;
    subject : Text;
    material : Text;
    status : { #draft; #published; #closed };
    createdAt : Int;
    shareToken : Text;
    allowedAttempts : Nat;
  };

  type Question = {
    id : Nat;
    assessmentId : Nat;
    number : Nat;
    kind : { #multipleChoice; #trueFalse; #shortAnswer; #essay };
    text : Text;
    optionA : ?Text;
    optionB : ?Text;
    optionC : ?Text;
    optionD : ?Text;
    answerKey : Text;
    weight : Nat;
  };

  type Answer = {
    questionId : Nat;
    response : Text;
    awardedScore : ?Nat;
    mentorComment : ?Text;
  };

  type Attempt = {
    id : Nat;
    assessmentId : Nat;
    owner : Principal;
    student : {
      fullName : Text;
      educationLevel : { #sdMi; #smpMts };
      className : Text;
      schoolName : Text;
      participantId : Text;
    };
    attemptNumber : Nat;
    status : { #inProgress; #awaitingReview; #graded };
    startedAt : Int;
    submittedAt : ?Int;
    answers : [Answer];
    mentorNote : ?Text;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    unlockedSessions : Map.Map<Principal, Bool>;
    mentors : Map.Map<Nat, MentorAccount>;
    mentorBindings : Map.Map<Principal, Nat>;
    nextMentorId : { var value : Nat };
    assessments : Map.Map<Nat, Assessment>;
    questions : Map.Map<Nat, Question>;
    nextAssessmentId : { var value : Nat };
    nextQuestionId : { var value : Nat };
    attempts : Map.Map<Nat, Attempt>;
    nextAttemptId : { var value : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      unlockedSessions = Map.empty();
      mentors = Map.empty();
      mentorBindings = Map.empty();
      nextMentorId = { var value = 0 };
      assessments = Map.empty();
      questions = Map.empty();
      nextAssessmentId = { var value = 0 };
      nextQuestionId = { var value = 0 };
      attempts = Map.empty();
      nextAttemptId = { var value = 0 };
    };
  };
};
