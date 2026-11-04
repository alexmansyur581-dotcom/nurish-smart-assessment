import Common "common";

module {
  /// A mentor account managed by an admin.
  public type MentorAccount = {
    id : Common.Id;
    email : Text;
    passwordHash : Text;
    displayName : Text;
    isActive : Bool;
    createdAt : Common.Timestamp;
  };

  /// Public view of a mentor account (no password material).
  public type MentorView = {
    id : Common.Id;
    email : Text;
    displayName : Text;
    isActive : Bool;
    createdAt : Common.Timestamp;
  };
};
