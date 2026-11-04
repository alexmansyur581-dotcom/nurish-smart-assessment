import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat64 "mo:core/Nat64";
import Random "mo:core/Random";
import Text "mo:core/Text";
import Common "../types/common";

module {
  /// Project a stored mentor account into its public view (no password material).
  public func toView(account : Common.MentorAccount) : Common.MentorView {
    {
      id = account.id;
      email = account.email;
      displayName = account.displayName;
      isActive = account.isActive;
      createdAt = account.createdAt;
    };
  };

  /// Normalize an email for case-insensitive lookup and storage.
  public func normalizeEmail(email : Text) : Text {
    email.trim(#predicate(func c = c == ' ')).toLower();
  };

  /// Find a mentor account by email (case-insensitive).
  public func findByEmail(
    mentors : Map.Map<Common.Id, Common.MentorAccount>,
    email : Text,
  ) : ?Common.MentorAccount {
    let target = normalizeEmail(email);
    mentors.values().find(func account = normalizeEmail(account.email) == target);
  };

  // --- Password hashing -----------------------------------------------------
  //
  // A salted, iterated digest over the UTF-8 bytes of the password. The stored
  // value is "salt:digest" so no extra stable field is required. This is a
  // deterministic one-way mixing function; it never stores or returns the
  // plaintext password.

  let hexDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

  func toHex(bytes : [Nat8]) : Text {
    var out = "";
    for (b in bytes.values()) {
      let n = b.toNat();
      out := out # hexDigits[n / 16] # hexDigits[n % 16];
    };
    out;
  };

  func mix(seed : Nat64, bytes : [Nat8]) : Nat64 {
    var h = seed;
    for (b in bytes.values()) {
      h := (h ^ b.toNat64()) *% 1099511628211;
      h := h ^ (h >> 13);
    };
    h;
  };

  func digestBytes(salt : Text, password : Text) : [Nat8] {
    let saltBytes = salt.encodeUtf8().toArray();
    let passBytes = password.encodeUtf8().toArray();
    var h = mix(14695981039346656037, saltBytes);
    h := mix(h, passBytes);
    // Iterate to slow down brute force.
    var i = 0;
    while (i < 1000) {
      h := mix(h, passBytes);
      i += 1;
    };
    Array.tabulate(8, func j = Nat64.toNat8((h >> (j * 8).toNat64()) & 0xff));
  };

  /// Produce a fresh random salt as a hex string.
  public func generateSalt() : async Text {
    let bytes = await Random.blob();
    toHex(bytes.toArray());
  };

  /// Hash a password with the given salt, returning "salt:digest".
  public func hashPassword(password : Text, salt : Text) : Text {
    salt # ":" # toHex(digestBytes(salt, password));
  };

  /// Verify a plaintext password against a stored "salt:digest" value.
  public func verifyPassword(password : Text, stored : Text) : Bool {
    let parts = stored.split(#char ':').toArray();
    if (parts.size() != 2) {
      return false;
    };
    let salt = parts[0];
    let digest = parts[1];
    toHex(digestBytes(salt, password)) == digest;
  };
};
