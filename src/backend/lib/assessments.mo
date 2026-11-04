import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";

/// Domain logic for assessments and their questions.
///
/// Every function here is pure with respect to the caller: authorization is
/// enforced by the API mixin, which passes the already-authorized caller in.
module {
  public type Assessment = Common.Assessment;
  public type Question = Common.Question;

  /// A single validation failure for an uploaded question row.
  public type RowError = {
    number : Nat;
    message : Text;
  };

  /// Convert an internal assessment to its public view.
  public func toView(a : Assessment) : Common.AssessmentView {
    {
      id = a.id;
      owner = a.owner;
      title = a.title;
      educationLevel = a.educationLevel;
      className = a.className;
      subject = a.subject;
      material = a.material;
      status = a.status;
      createdAt = a.createdAt;
      shareToken = a.shareToken;
      allowedAttempts = a.allowedAttempts;
    };
  };

  /// Strip the answer key from a question for the student page.
  public func toStudentQuestion(q : Question) : Common.StudentQuestion {
    {
      id = q.id;
      number = q.number;
      kind = q.kind;
      text = q.text;
      optionA = q.optionA;
      optionB = q.optionB;
      optionC = q.optionC;
      optionD = q.optionD;
      weight = q.weight;
    };
  };

  /// Whether `caller` may read or change `a` (admin or owner).
  public func canManage(isAdmin : Bool, caller : Principal, a : Assessment) : Bool {
    isAdmin or caller.equal(a.owner);
  };

  /// Create a new draft assessment owned by `owner`.
  public func create(
    assessments : Map.Map<Common.Id, Assessment>,
    nextAssessmentId : { var value : Common.Id },
    owner : Principal,
    title : Text,
    educationLevel : Common.EducationLevel,
    className : Text,
    subject : Text,
    material : Text,
    allowedAttempts : Nat,
  ) : Assessment {
    let id = nextAssessmentId.value;
    nextAssessmentId.value := id + 1;
    let assessment : Assessment = {
      id;
      owner;
      title;
      educationLevel;
      className;
      subject;
      material;
      status = #draft;
      createdAt = Time.now();
      shareToken = "";
      allowedAttempts;
    };
    assessments.add(id, assessment);
    assessment;
  };

  /// Update an assessment's editable metadata. Returns the updated record.
  public func update(
    assessments : Map.Map<Common.Id, Assessment>,
    id : Common.Id,
    title : Text,
    educationLevel : Common.EducationLevel,
    className : Text,
    subject : Text,
    material : Text,
    allowedAttempts : Nat,
  ) : ?Assessment {
    switch (assessments.get(id)) {
      case null { null };
      case (?a) {
        let updated : Assessment = {
          id = a.id;
          owner = a.owner;
          title;
          educationLevel;
          className;
          subject;
          material;
          status = a.status;
          createdAt = a.createdAt;
          shareToken = a.shareToken;
          allowedAttempts;
        };
        assessments.add(id, updated);
        ?updated;
      };
    };
  };

  /// Close an assessment so no further attempts may start.
  public func close(
    assessments : Map.Map<Common.Id, Assessment>,
    id : Common.Id,
  ) : ?Assessment {
    switch (assessments.get(id)) {
      case null { null };
      case (?a) {
        let updated : Assessment = {
          id = a.id;
          owner = a.owner;
          title = a.title;
          educationLevel = a.educationLevel;
          className = a.className;
          subject = a.subject;
          material = a.material;
          status = #closed;
          createdAt = a.createdAt;
          shareToken = a.shareToken;
          allowedAttempts = a.allowedAttempts;
        };
        assessments.add(id, updated);
        ?updated;
      };
    };
  };

  /// Publish an assessment, generating a unique share token when absent.
  public func publish(
    assessments : Map.Map<Common.Id, Assessment>,
    id : Common.Id,
  ) : ?Assessment {
    switch (assessments.get(id)) {
      case null { null };
      case (?a) {
        let token = if (a.shareToken == "") { generateToken(a.id) } else { a.shareToken };
        let updated : Assessment = {
          id = a.id;
          owner = a.owner;
          title = a.title;
          educationLevel = a.educationLevel;
          className = a.className;
          subject = a.subject;
          material = a.material;
          status = #published;
          createdAt = a.createdAt;
          shareToken = token;
          allowedAttempts = a.allowedAttempts;
        };
        assessments.add(id, updated);
        ?updated;
      };
    };
  };

  /// Deterministic, collision-resistant share token derived from the id and time.
  public func generateToken(id : Common.Id) : Text {
    let now = Time.now();
    let mixed = (id * 2654435761) + now.toNat();
    "asm-" # id.toText() # "-" # mixed.toText();
  };

  /// Remove an assessment and every question that belongs to it.
  public func remove(
    assessments : Map.Map<Common.Id, Assessment>,
    questions : Map.Map<Common.Id, Question>,
    id : Common.Id,
  ) : Bool {
    if (not assessments.containsKey(id)) {
      return false;
    };
    assessments.remove(id);
    let snapshot = questions.values().toArray();
    for (q in snapshot.values()) {
      if (q.assessmentId == id) {
        questions.remove(q.id);
      };
    };
    true;
  };

  /// Validate one question row. Returns `null` when the row is valid.
  public func validateRow(q : Question) : ?RowError {
    if (q.number == 0) {
      return ?{ number = q.number; message = "Nomor soal wajib diisi" };
    };
    if (q.text == "") {
      return ?{ number = q.number; message = "Pertanyaan wajib diisi" };
    };
    if (q.weight == 0) {
      return ?{ number = q.number; message = "Bobot nilai harus lebih dari 0" };
    };
    switch (q.kind) {
      case (#multipleChoice) {
        switch (q.optionA, q.optionB, q.optionC, q.optionD) {
          case (?_, ?_, ?_, ?_) {};
          case _ {
            return ?{ number = q.number; message = "Pilihan ganda memerlukan pilihan A sampai D" };
          };
        };
        let key = q.answerKey.toUpper();
        if (key != "A" and key != "B" and key != "C" and key != "D") {
          return ?{ number = q.number; message = "Kunci pilihan ganda harus A, B, C, atau D" };
        };
      };
      case (#trueFalse) {
        let key = q.answerKey.toUpper();
        if (key != "BENAR" and key != "SALAH") {
          return ?{ number = q.number; message = "Kunci Benar/Salah harus BENAR atau SALAH" };
        };
      };
      case (#shortAnswer) {
        if (q.answerKey == "") {
          return ?{ number = q.number; message = "Kunci isian singkat wajib diisi" };
        };
      };
      case (#essay) {
        if (q.answerKey == "") {
          return ?{ number = q.number; message = "Kunci esai wajib diisi" };
        };
      };
    };
    null;
  };

  /// Validate every row. Returns all failures in question-number order.
  public func validateRows(rows : [Question]) : [RowError] {
    let errors = rows.map(func q = validateRow(q)).filter(func e = e != null);
    let collected = errors.map(func e = e ?? { number = 0; message = "" });
    collected.sort(func (a, b) = Nat.compare(a.number, b.number));
  };

  /// Replace all questions for an assessment with the validated rows.
  /// Callers must validate first; this assumes every row is valid.
  public func replaceQuestions(
    questions : Map.Map<Common.Id, Question>,
    nextQuestionId : { var value : Common.Id },
    assessmentId : Common.Id,
    rows : [Question],
  ) : Nat {
    let snapshot = questions.values().toArray();
    for (q in snapshot.values()) {
      if (q.assessmentId == assessmentId) {
        questions.remove(q.id);
      };
    };
    var stored = 0;
    for (row in rows.values()) {
      let id = nextQuestionId.value;
      nextQuestionId.value := id + 1;
      let question : Question = {
        id;
        assessmentId;
        number = row.number;
        kind = row.kind;
        text = row.text;
        optionA = row.optionA;
        optionB = row.optionB;
        optionC = row.optionC;
        optionD = row.optionD;
        answerKey = row.answerKey;
        weight = row.weight;
      };
      questions.add(id, question);
      stored += 1;
    };
    stored;
  };

  /// Questions of an assessment, ordered by question number.
  public func questionsFor(
    questions : Map.Map<Common.Id, Question>,
    assessmentId : Common.Id,
  ) : [Question] {
    let matching = questions.values().toArray().filter(func q = q.assessmentId == assessmentId);
    matching.sort(func (a, b) = Nat.compare(a.number, b.number));
  };

  /// Find an assessment by its share token.
  public func findByToken(
    assessments : Map.Map<Common.Id, Assessment>,
    token : Text,
  ) : ?Assessment {
    if (token == "") {
      return null;
    };
    assessments.values().toArray().find(func a = a.shareToken == token);
  };

  /// Format validation failures into a single human-readable message.
  public func formatErrors(errors : [RowError]) : Text {
    errors.values().map(func e = "Soal " # e.number.toText() # ": " # e.message).join("; ");
  };
};
