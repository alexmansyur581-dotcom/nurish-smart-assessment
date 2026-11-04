import { useAppUnlocked, useUnlockApp } from "@/hooks/useQueries";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

const SESSION_KEY = "nurish-smart-unlocked";

/**
 * Shared application password gate. The password is verified on the server via
 * `unlockApp`; a successful unlock is remembered for the browser session so the
 * user is not asked again until the tab is closed.
 */
export function PasswordGate({ children }: { children: ReactNode }) {
  const [sessionUnlocked, setSessionUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const unlock = useUnlockApp();
  const { data: serverUnlocked, isLoading } = useAppUnlocked();

  const unlocked = sessionUnlocked || serverUnlocked === true;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const value = password;
    if (value.trim().length === 0) {
      setError("Masukkan kata sandi aplikasi terlebih dahulu.");
      return;
    }
    unlock.mutate(value, {
      onSuccess: (ok) => {
        if (ok) {
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* session storage unavailable — server state still unlocks */
          }
          setSessionUnlocked(true);
          setPassword("");
        } else {
          setError("Kata sandi salah. Silakan coba lagi.");
        }
      },
      onError: () => {
        setError("Tidak dapat memverifikasi kata sandi. Periksa koneksi Anda.");
      },
    });
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <main
      data-ocid="password_gate.page"
      className="flex min-h-dvh items-center justify-center bg-background bg-answer-grid px-4 py-10"
    >
      <section
        aria-labelledby="gate-title"
        className="w-full max-w-md animate-rise rounded-2xl border border-border bg-card p-7 shadow-elevated md:p-9"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold tracking-tight text-foreground">
              NURISH SMART
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Platform Asesmen
            </p>
          </div>
        </div>

        <h1
          id="gate-title"
          className="font-display text-2xl font-bold tracking-tight text-foreground"
        >
          Masuk ke aplikasi
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini dilindungi. Masukkan kata sandi aplikasi untuk
          melanjutkan.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="app-password"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Kata Sandi Aplikasi
            </label>
            <input
              id="app-password"
              data-ocid="password_gate.input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              role="alert"
              data-ocid="password_gate.error_state"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            data-ocid="password_gate.submit_button"
            disabled={unlock.isPending || isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            {unlock.isPending ? "Memverifikasi…" : "Buka Aplikasi"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Akses hanya untuk pengajar dan pengelola asesmen.
        </p>
      </section>
    </main>
  );
}
