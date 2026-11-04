import { AttemptStatus } from "@/backend";
import { useAttemptResult } from "@/hooks/useQueries";
import { attemptStatusLabel, formatDateTime } from "@/lib/format";
import { useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareQuote,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

export default function StudentResultPage() {
  const { attemptId } = useParams({
    from: "/student/exam/$token/result/$attemptId",
  });

  const attemptIdBig = useMemo(() => {
    try {
      return BigInt(attemptId);
    } catch {
      return null;
    }
  }, [attemptId]);

  const resultQuery = useAttemptResult(attemptIdBig);
  const result = resultQuery.data ?? null;

  if (resultQuery.isLoading) {
    return (
      <section data-ocid="student_result.page" className="space-y-6">
        <div
          data-ocid="student_result.loading_state"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-subtle"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat hasil…
        </div>
      </section>
    );
  }

  if (resultQuery.isError || !result) {
    return (
      <section data-ocid="student_result.page" className="space-y-6">
        <div
          data-ocid="student_result.error_state"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Hasil tidak ditemukan</p>
            <p className="mt-1 text-destructive/90">
              Hasil pengerjaan ini tidak tersedia. Pastikan tautan benar atau
              hubungi pengajar Anda.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const graded = result.status === AttemptStatus.graded;

  if (!graded) {
    return (
      <section data-ocid="student_result.page" className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Hasil Pengerjaan
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {result.student.fullName}
          </h1>
        </header>
        <div
          data-ocid="student_result.pending_state"
          className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-6 text-sm text-warning-foreground"
        >
          <Clock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{attemptStatusLabel(result.status)}</p>
            <p className="mt-1 text-warning-foreground/90">
              Jawaban Anda sudah dikumpulkan. Nilai akan tampil di sini setelah
              pengajar menyelesaikan penilaian seluruh soal.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const finalScore = result.finalScore.toString();

  const stats = [
    {
      label: "Benar",
      value: result.correctCount.toString(),
      icon: CheckCircle2,
      tone: "text-success",
    },
    {
      label: "Salah",
      value: result.wrongCount.toString(),
      icon: XCircle,
      tone: "text-destructive",
    },
    {
      label: "Tidak Dijawab",
      value: result.unansweredCount.toString(),
      icon: MinusCircle,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <section data-ocid="student_result.page" className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Hasil Pengerjaan
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {result.student.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {result.student.schoolName} · Kelas {result.student.className} ·{" "}
          {result.student.participantId}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div
          data-ocid="student_result.score_card"
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-gradient-primary p-7 text-center text-primary-foreground shadow-elevated"
        >
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90">
            Nilai Akhir
          </p>
          <p className="mt-2 font-display text-5xl font-extrabold tracking-tight">
            {finalScore}
          </p>
          <p className="mt-2 text-xs opacity-90">
            dari skala 100 · {result.totalQuestions.toString()} soal
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  data-ocid={`student_result.stat_${stat.label.toLowerCase().replace(/\s+/g, "_")}`}
                  className="rounded-2xl border border-border bg-card p-4 text-center shadow-subtle"
                >
                  <Icon
                    className={`mx-auto size-5 ${stat.tone}`}
                    aria-hidden="true"
                  />
                  <p className="mt-2 font-display text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Rincian Nilai
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Nilai Objektif</dt>
                <dd className="font-semibold text-foreground">
                  {result.objectiveScore.toString()}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Nilai Manual</dt>
                <dd className="font-semibold text-foreground">
                  {result.manualScore.toString()}
                </dd>
              </div>
              {result.submittedAt !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Dikumpulkan</dt>
                  <dd className="font-semibold text-foreground">
                    {formatDateTime(result.submittedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {result.mentorNote && (
            <div
              data-ocid="student_result.mentor_note"
              className="rounded-2xl border border-border bg-muted/40 p-5"
            >
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <MessageSquareQuote className="size-4" aria-hidden="true" />
                Catatan Pengajar
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {result.mentorNote}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="rounded-2xl border border-border bg-muted/40 px-5 py-4 text-xs text-muted-foreground">
        Kunci jawaban dan pembahasan tidak ditampilkan. Silakan hubungi pengajar
        Anda untuk pembahasan lebih lanjut.
      </p>
    </section>
  );
}
