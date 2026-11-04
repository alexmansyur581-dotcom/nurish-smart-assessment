import Map "mo:core/Map";
import Principal "mo:core/Principal";

/// Shared application password gate.
///
/// The single application password is compared only on the server. It is never
/// returned by any query and never appears in a URL. Unlocking is per-caller:
/// the caller's principal is recorded in `unlockedSessions` once the password
/// matches, and `isAppUnlocked` reports that recorded state.
mixin (unlockedSessions : Map.Map<Principal, Bool>) {
  /// The shared application password. Kept server-side only.
  transient let appPassword = "B4kung4n";

  /// Verify the shared application password and open the gate for the caller.
  public shared ({ caller }) func unlockApp(password : Text) : async Bool {
    if (password == appPassword) {
      unlockedSessions.add(caller, true);
      true;
    } else {
      false;
    };
  };

  /// Report whether the caller has already unlocked the application.
  public query ({ caller }) func isAppUnlocked() : async Bool {
    switch (unlockedSessions.get(caller)) {
      case (?unlocked) { unlocked };
      case null { false };
    };
  };
};
