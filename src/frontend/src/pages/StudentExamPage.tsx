import type { Attempt, StudentQuestion } from "@/backend";
import { QuestionKind } from "@/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAssessmentByToken,
  useSaveAnswer,
  useStartAttempt,
  useSubmitAttempt,
} from "@/hooks/useQueries";
import { questionKindLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CloudOff,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readStoredIdentity } from "./StudentEntryPage";

type SaveState = "idle" | "saving" | "saved" | "error";

function isAnswered(response: string): boolean {
  return response.trim().length > 0;
}

function ChoiceButton({
  label,
  text,
  selected,
  onSelect,
  ocid,
}: {
  label: string;
  text: string;
  selected: boolean;
  onSelect: () => void;
  ocid: string;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-input bg-background text-foreground hover:bg-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        {selected ? <Check className="size-3.5" /> : label}
      </span>
      <span className="min-w-0 flex-1 break-words">{text}</span>
    </button>
  );
}

export default function StudentExamPage() {
  const { token, attemptId } = useParams({
    from: "/student/exam/$token/attempt/$attemptId",
  });
  const navigate = useNavigate();
  const assessmentQuery = useAssessmentByToken(token);
  const startAttempt = useStartAttempt();
  const saveAnswer = useSaveAnswer();
  const submitAttempt = useSubmitAttempt();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [offline, setOffline] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const pendingRef = useRef<Map<string, string>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  const assessment = assessmentQuery.data?.[0] ?? null;
  const questions = useMemo(
    () => assessmentQuery.data?.[1] ?? [],
    [assessmentQuery.data],
  );

  const attemptIdBig = useMemo(() => {
    try {
      return BigInt(attemptId);
    } catch {
      return null;
    }
  }, [attemptId]);

  /* Resume the attempt from the stored identity on first load. */
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!assessmentQuery.isSuccess) return;
    if (attemptIdBig === null) {
      setBootstrapError("Tautan pengerjaan tidak valid.");
      setBootstrapping(false);
      return;
    }
    const identity = readStoredIdentity(token);
    if (!identity) {
      void navigate({
        to: "/exam/$token",
        params: { token },
        replace: true,
      });
      return;
    }
    bootstrappedRef.current = true;
    startAttempt.mutate(
      { token, student: identity },
      {
        onSuccess: (resumed) => {
          if (!resumed || resumed.id !== attemptIdBig) {
            setBootstrapError(
              "Pengerjaan tidak dapat dilanjutkan. Silakan mulai ulang dari halaman identitas.",
            );
            setBootstrapping(false);
            return;
          }
          setAttempt(resumed);
          const restored: Record<string, string> = {};
          for (const answer of resumed.answers) {
            restored[answer.questionId.toString()] = answer.response;
          }
          setResponses(restored);
          setBootstrapping(false);
        },
        onError: () => {
          setBootstrapError(
            "Gagal memuat pengerjaan. Periksa koneksi Anda lalu muat ulang halaman.",
          );
          setBootstrapping(false);
        },
      },
    );
  }, [assessmentQuery.isSuccess, attemptIdBig, navigate, startAttempt, token]);

  /* Track connectivity so a dropped connection is visible to the student. */
  useEffect(() => {
    function goOffline() {
      setOffline(true);
    }
    function goOnline() {
      setOffline(false);
    }
    setOffline(!navigator.onLine);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const flushPending = useCallback(() => {
    if (!attempt || attempt.status !== "inProgress") return;
    const entries = Array.from(pendingRef.current.entries()).filter(
      ([questionId]) => !inFlightRef.current.has(questionId),
    );
    if (entries.length === 0) return;
    setSaveState("saving");
    let remaining = entries.length;
    let failed = false;
    for (const [questionId, response] of entries) {
      inFlightRef.current.add(questionId);
      saveAnswer.mutate(
        { attemptId: attempt.id, questionId: BigInt(questionId), response },
        {
          onSuccess: () => {
            inFlightRef.current.delete(questionId);
            pendingRef.current.delete(questionId);
            remaining -= 1;
            if (remaining === 0) setSaveState(failed ? "error" : "saved");
          },
          onError: () => {
            inFlightRef.current.delete(questionId);
            failed = true;
            remaining -= 1;
            if (remaining === 0) setSaveState("error");
          },
        },
      );
    }
  }, [attempt, saveAnswer]);

  /* Retry queued saves as soon as the connection returns. */
  useEffect(() => {
    if (!offline) flushPending();
  }, [offline, flushPending]);

  function queueSave(questionId: string, response: string) {
    pendingRef.current.set(questionId, response);
    if (offline) {
      setSaveState("error");
      return;
    }
    flushPending();
  }

  function handleResponseChange(question: StudentQuestion, value: string) {
    const key = question.id.toString();
    setResponses((prev) => ({ ...prev, [key]: value }));
    queueSave(key, value);
  }

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => isAnswered(responses[q.id.toString()] ?? ""))
        .length,
    [questions, responses],
  );
  const total = questions.length;
  const progressPct =
    total === 0 ? 0 : Math.round((answeredCount / total) * 100);
  const current = questions[currentIndex] ?? null;
  const isLast = currentIndex === total - 1;
  const locked = attempt?.status !== "inProgress";

  function handleSubmit() {
    if (!attempt) return;
    setSubmitError(null);
    submitAttempt.mutate(attempt.id, {
      onSuccess: (submitted) => {
        if (!submitted) {
          setSubmitError(
            "Jawaban tidak dapat dikumpulkan saat ini. Coba lagi sebentar lagi.",
          );
          return;
        }
        setAttempt(submitted);
        setConfirmOpen(false);
        void navigate({
          to: "/exam/$token/result/$attemptId",
          params: { token, attemptId: attempt.id.toString() },
        });
      },
      onError: () => {
        setSubmitError(
          "Gagal mengumpulkan jawaban. Periksa koneksi Anda lalu coba lagi.",
        );
      },
    });
  }

  if (bootstrapping || assessmentQuery.isLoading) {
    return (
      <section data-ocid="student_exam.page" className="space-y-6">
        <div
          data-ocid="student_exam.loading_state"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-subtle"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat soal…
        </div>
      </section>
    );
  }

  if (bootstrapError || !attempt || !assessment || !current) {
    return (
      <section data-ocid="student_exam.page" className="space-y-6">
        <div
          data-ocid="student_exam.error_state"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Pengerjaan tidak tersedia</p>
            <p className="mt-1 text-destructive/90">
              {bootstrapError ??
                "Soal tidak dapat dimuat. Muat ulang halaman atau minta tautan baru kepada pengajar Anda."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const currentKey = current.id.toString();
  const currentResponse = responses[currentKey] ?? "";

  return (
    <section data-ocid="student_exam.page" className="space-y-5">
      <header className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {assessment.subject}
            </p>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {assessment.title}
            </h1>
          </div>
          <span
            data-ocid="student_exam.progress_label"
            className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground"
          >
            {answeredCount} / {total} terjawab
          </span>
        </div>
        <div
          role="progressbar"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label="Progres pengerjaan"
          data-ocid="student_exam.progress_bar"
          className="h-2 w-full overflow-hidden rounded-full bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div
            className="h-full rounded-full bg-primary transition-smooth"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {offline && (
        <div
          role="alert"
          data-ocid="student_exam.offline_notice"
          className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
        >
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Koneksi terputus</p>
            <p className="text-warning-foreground/90">
              Jawaban Anda disimpan sementara dan akan dikirim otomatis saat
              koneksi kembali.
            </p>
          </div>
          <button
            type="button"
            data-ocid="student_exam.retry_button"
            onClick={flushPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-warning/50 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-smooth hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-subtle md:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                Soal {current.number.toString()} dari {total}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {questionKindLabel(current.kind)}
              </span>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground">
              {current.text}
            </p>

            <div className="mt-5 space-y-2.5">
              {current.kind === QuestionKind.multipleChoice &&
                (
                  [
                    ["A", current.optionA],
                    ["B", current.optionB],
                    ["C", current.optionC],
                    ["D", current.optionD],
                  ] as const
                )
                  .filter(([, text]) => Boolean(text))
                  .map(([label, text]) => (
                    <ChoiceButton
                      key={label}
                      label={label}
                      text={text ?? ""}
                      selected={currentResponse === label}
                      onSelect={() => handleResponseChange(current, label)}
                      ocid={`student_exam.option_${label.toLowerCase()}`}
                    />
                  ))}

              {current.kind === QuestionKind.trueFalse && (
                <>
                  <ChoiceButton
                    label="B"
                    text="Benar"
                    selected={currentResponse === "B"}
                    onSelect={() => handleResponseChange(current, "B")}
                    ocid="student_exam.option_true"
                  />
                  <ChoiceButton
                    label="S"
                    text="Salah"
                    selected={currentResponse === "S"}
                    onSelect={() => handleResponseChange(current, "S")}
                    ocid="student_exam.option_false"
                  />
                </>
              )}

              {current.kind === QuestionKind.shortAnswer && (
                <input
                  data-ocid="student_exam.short_answer_input"
                  type="text"
                  value={currentResponse}
                  onChange={(event) =>
                    handleResponseChange(current, event.target.value)
                  }
                  placeholder="Tulis jawaban singkat Anda"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              )}

              {current.kind === QuestionKind.essay && (
                <textarea
                  data-ocid="student_exam.essay_input"
                  value={currentResponse}
                  onChange={(event) =>
                    handleResponseChange(current, event.target.value)
                  }
                  rows={6}
                  placeholder="Tulis jawaban lengkap Anda"
                  className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-base leading-relaxed text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              {saveState === "saving" && (
                <span
                  data-ocid="student_exam.save_state"
                  className="inline-flex items-center gap-1.5 text-muted-foreground"
                >
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Menyimpan…
                </span>
              )}
              {saveState === "saved" && (
                <span
                  data-ocid="student_exam.save_state"
                  className="inline-flex items-center gap-1.5 text-success"
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Jawaban tersimpan
                </span>
              )}
              {saveState === "error" && (
                <span
                  data-ocid="student_exam.save_state"
                  className="inline-flex items-center gap-1.5 text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  Belum tersimpan — akan dicoba lagi
                </span>
              )}
            </div>
          </article>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              data-ocid="student_exam.prev_button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-smooth hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Sebelumnya
            </button>

            {isLast ? (
              <button
                type="button"
                data-ocid="student_exam.submit_button"
                disabled={locked}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="size-4" aria-hidden="true" />
                Kumpulkan Jawaban
              </button>
            ) : (
              <button
                type="button"
                data-ocid="student_exam.next_button"
                onClick={() =>
                  setCurrentIndex((index) => Math.min(total - 1, index + 1))
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Berikutnya
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Navigasi Soal
            </h2>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
              {questions.map((question, index) => {
                const answered = isAnswered(
                  responses[question.id.toString()] ?? "",
                );
                const active = index === currentIndex;
                return (
                  <button
                    key={question.id.toString()}
                    type="button"
                    data-ocid={`student_exam.question_nav.${index + 1}`}
                    aria-label={`Soal ${question.number.toString()}${answered ? ", sudah dijawab" : ", belum dijawab"}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : answered
                          ? "border-success/50 bg-success/15 text-success"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {question.number.toString()}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 rounded border border-success/50 bg-success/15"
                />
                Sudah dijawab ({answeredCount})
              </p>
              <p className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 rounded border border-border bg-background"
                />
                Belum dijawab ({total - answeredCount})
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Tanpa batas waktu</p>
            <p className="mt-1">
              Kerjakan dengan tenang. Setiap jawaban tersimpan otomatis.
            </p>
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-ocid="student_exam.confirm_modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan jawaban sekarang?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda telah menjawab {answeredCount} dari {total} soal.
              {total - answeredCount > 0
                ? ` Masih ada ${total - answeredCount} soal yang belum dijawab.`
                : " Semua soal sudah dijawab."}{" "}
              Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {submitError && (
            <p
              role="alert"
              data-ocid="student_exam.submit_error"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-lg"
              data-ocid="student_exam.cancel_button"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg"
              disabled={submitAttempt.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
              data-ocid="student_exam.confirm_button"
            >
              {submitAttempt.isPending ? (
                <>
                  <Loader2
                    className="mr-1.5 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Mengumpulkan…
                </>
              ) : (
                "Ya, Kumpulkan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
