import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import EducationLevelValue "types/EducationLevelValue";
import AssessmentStatusValue "types/AssessmentStatusValue";
import QuestionKindValue "types/QuestionKindValue";
import AttemptStatusValue "types/AttemptStatusValue";
import Common "types/common";
import GateApi "mixins/gate-api";
import AccountsApi "mixins/accounts-api";
import AssessmentsApi "mixins/assessments-api";
import AttemptsApi "mixins/attempts-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let unlockedSessions : Map.Map<Principal, Bool>;

  let mentors : Map.Map<Common.Id, Common.MentorAccount>;
  let mentorBindings : Map.Map<Principal, Common.Id>;
  let nextMentorId : { var value : Common.Id };

  let assessments : Map.Map<Common.Id, Common.Assessment>;
  let questions : Map.Map<Common.Id, Common.Question>;
  let nextAssessmentId : { var value : Common.Id };
  let nextQuestionId : { var value : Common.Id };

  let attempts : Map.Map<Common.Id, Common.Attempt>;
  let nextAttemptId : { var value : Common.Id };

  include GateApi(unlockedSessions);
  include AccountsApi(accessControlState, mentors, mentorBindings, nextMentorId);
  include AssessmentsApi(accessControlState, assessments, questions, nextAssessmentId, nextQuestionId);
  include AttemptsApi(accessControlState, assessments, questions, attempts, nextAttemptId);
  include ApiDocMixin();

  transient let anyPrincipal = Principal.fromText("aaaaa-aa");

  include Expose({
    entities = [
      mentors.toEntity("mentor", "MentorAccount", "id")
        .sample({
          id = 0;
          email = "";
          passwordHash = "";
          displayName = "";
          isActive = true;
          createdAt = 0;
        })
        .hidden("passwordHash")
        .controllerOnly()
        .build(),
      assessments.toEntity("assessment", "Assessment", "id")
        .sample({
          id = 0;
          owner = anyPrincipal;
          title = "";
          educationLevel = #sdMi;
          className = "";
          subject = "";
          material = "";
          status = #draft;
          createdAt = 0;
          shareToken = "";
          allowedAttempts = 0;
        })
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
      questions.toEntity("question", "Question", "id")
        .sample({
          id = 0;
          assessmentId = 0;
          number = 0;
          kind = #multipleChoice;
          text = "";
          optionA = ?"";
          optionB = ?"";
          optionC = ?"";
          optionD = ?"";
          answerKey = "";
          weight = 0;
        })
        .hidden("answerKey")
        .controllerOnly()
        .build(),
      OQL.Entity.manual<Common.Attempt>("attempt", func () = attempts.values(), "Attempt", "id")
        .sample({
          id = 0;
          assessmentId = 0;
          owner = anyPrincipal;
          student = {
            fullName = "";
            educationLevel = #sdMi;
            className = "";
            schoolName = "";
            participantId = "";
          };
          attemptNumber = 0;
          status = #inProgress;
          startedAt = 0;
          submittedAt = ?0;
          answers = [];
          mentorNote = ?"";
        })
        .payload("id", func a = a.id)
        .payload("assessmentId", func a = a.assessmentId)
        .payload("studentName", func a = a.student.fullName)
        .payload("studentEducationLevel", func a = a.student.educationLevel)
        .payload("studentClass", func a = a.student.className)
        .payload("studentSchool", func a = a.student.schoolName)
        .payload("participantId", func a = a.student.participantId)
        .payload("attemptNumber", func a = a.attemptNumber)
        .payload("status", func a = a.status)
        .payload("startedAt", func a = a.startedAt)
        .payload("submittedAt", func a = a.submittedAt)
        .payload("answerCount", func a = a.answers.size())
        .payload("mentorNote", func a = a.mentorNote)
        .controllerOnly()
        .build(),
    ];
  });
};
