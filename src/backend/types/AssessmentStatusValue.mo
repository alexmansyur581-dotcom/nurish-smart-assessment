import OQL "mo:caffeineai-oql";

/// OQL value projection for `Common.AssessmentStatus`.
module {
  public func _toRow(self : { #draft; #published; #closed }) : OQL.Value {
    #text(
      switch self {
        case (#draft) { "draft" };
        case (#published) { "published" };
        case (#closed) { "closed" };
      }
    );
  };
};
