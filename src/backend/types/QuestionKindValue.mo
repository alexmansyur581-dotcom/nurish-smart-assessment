import OQL "mo:caffeineai-oql";

/// OQL value projection for `Common.QuestionKind`.
module {
  public func _toRow(self : { #multipleChoice; #trueFalse; #shortAnswer; #essay }) : OQL.Value {
    #text(
      switch self {
        case (#multipleChoice) { "multipleChoice" };
        case (#trueFalse) { "trueFalse" };
        case (#shortAnswer) { "shortAnswer" };
        case (#essay) { "essay" };
      }
    );
  };
};
