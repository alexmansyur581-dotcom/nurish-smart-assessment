import OQL "mo:caffeineai-oql";

/// OQL value projection for `Common.EducationLevel`.
module {
  public func _toRow(self : { #sdMi; #smpMts }) : OQL.Value {
    #text(
      switch self {
        case (#sdMi) { "sdMi" };
        case (#smpMts) { "smpMts" };
      }
    );
  };
};
