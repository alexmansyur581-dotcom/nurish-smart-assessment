import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import AccountsLib "../lib/accounts";
import Common "../types/common";

mixin (
  accessControlState : AccessControl.AccessControlState,
  mentors : Map.Map<Common.Id, Common.MentorAccount>,
  mentorBindings : Map.Map<Principal, Common.Id>,
  nextMentorId : { var value : Common.Id },
) {
  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can manage mentor accounts");
    };
  };

  /// List every mentor account (admin only).
  public query ({ caller }) func listMentors() : async [Common.MentorView] {
    requireAdmin(caller);
    mentors.values().map(AccountsLib.toView).toArray();
  };

  /// Create a mentor account (admin only).
  public shared ({ caller }) func createMentor(
    email : Text,
    password : Text,
    displayName : Text,
  ) : async Common.MentorView {
    requireAdmin(caller);
    let normalizedEmail = AccountsLib.normalizeEmail(email);
    if (normalizedEmail == "") {
      Runtime.trap("Email is required");
    };
    if (password.size() < 6) {
      Runtime.trap("Password must be at least 6 characters");
    };
    if (displayName.trim(#predicate(func c = c == ' ')) == "") {
      Runtime.trap("Display name is required");
    };
    switch (AccountsLib.findByEmail(mentors, normalizedEmail)) {
      case (?_) { Runtime.trap("A mentor with this email already exists") };
      case null {};
    };
    let salt = await AccountsLib.generateSalt();
    let id = nextMentorId.value;
    nextMentorId.value := id + 1;
    let account : Common.MentorAccount = {
      id;
      email = normalizedEmail;
      passwordHash = AccountsLib.hashPassword(password, salt);
      displayName;
      isActive = true;
      createdAt = Time.now();
    };
    mentors.add(id, account);
    AccountsLib.toView(account);
  };

  /// Activate or deactivate a mentor account (admin only).
  public shared ({ caller }) func setMentorActive(id : Common.Id, isActive : Bool) : async ?Common.MentorView {
    requireAdmin(caller);
    switch (mentors.get(id)) {
      case (?account) {
        let updated : Common.MentorAccount = {
          id = account.id;
          email = account.email;
          passwordHash = account.passwordHash;
          displayName = account.displayName;
          isActive;
          createdAt = account.createdAt;
        };
        mentors.add(id, updated);
        ?AccountsLib.toView(updated);
      };
      case null { null };
    };
  };

  /// Delete a mentor account (admin only).
  public shared ({ caller }) func deleteMentor(id : Common.Id) : async Bool {
    requireAdmin(caller);
    switch (mentors.get(id)) {
      case (?_) {
        mentors.remove(id);
        // Drop any principal binding that pointed at this account.
        let bound = mentorBindings.entries().filter(func ((_, mentorId)) = mentorId == id).toArray();
        for ((principal, _) in bound.values()) {
          mentorBindings.remove(principal);
        };
        true;
      };
      case null { false };
    };
  };

  /// Sign in a mentor with email and password.
  public shared ({ caller }) func mentorLogin(email : Text, password : Text) : async ?Common.MentorView {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in is required to access the mentor dashboard");
    };
    switch (AccountsLib.findByEmail(mentors, email)) {
      case (?account) {
        if (not account.isActive) {
          Runtime.trap("This mentor account is inactive");
        };
        if (not AccountsLib.verifyPassword(password, account.passwordHash)) {
          Runtime.trap("Invalid email or password");
        };
        mentorBindings.add(caller, account.id);
        ?AccountsLib.toView(account);
      };
      case null { Runtime.trap("Invalid email or password") };
    };
  };

  /// Return the mentor account bound to the caller, if any.
  public query ({ caller }) func getCallerMentor() : async ?Common.MentorView {
    switch (mentorBindings.get(caller)) {
      case (?id) {
        switch (mentors.get(id)) {
          case (?account) { ?AccountsLib.toView(account) };
          case null { null };
        };
      };
      case null { null };
    };
  };
};
