import OQL "mo:caffeineai-oql";

/// OQL value projection for `Common.AttemptStatus`.
module {
  public func _toRow(self : { #inProgress; #awaitingReview; #graded }) : OQL.Value {
    #text(
      switch self {
        case (#inProgress) { "inProgress" };
        case (#awaitingReview) { "awaitingReview" };
        case (#graded) { "graded" };
      }
    );
  };
};
