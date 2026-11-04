import { EducationLevel, type StudentIdentity } from "@/backend";
import { useAssessmentByToken, useStartAttempt } from "@/hooks/useQueries";
import { educationLevelLabel } from "@/lib/format";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  GraduationCap,
  Loader2,
  School,
  UserRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const IDENTITY_KEY_PREFIX = "nurish-smart-student-identity:";

export function readStoredIdentity(token: string): StudentIdentity | null {
  try {
    const raw = localStorage.getItem(`${IDENTITY_KEY_PREFIX}${token}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudentIdentity>;
    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.participantId !== "string" ||
      typeof parsed.className !== "string" ||
      typeof parsed.schoolName !== "string" ||
      (parsed.educationLevel !== EducationLevel.sdMi &&
        parsed.educationLevel !== EducationLevel.smpMts)
    ) {
      return null;
    }
    return {
      fullName: parsed.fullName,
      participantId: parsed.participantId,
      className: parsed.className,
      schoolName: parsed.schoolName,
      educationLevel: parsed.educationLevel,
    };
  } catch {
    return null;
  }
}

export function storeIdentity(token: string, identity: StudentIdentity): void {
  try {
    localStorage.setItem(
      `${IDENTITY_KEY_PREFIX}${token}`,
      JSON.stringify(identity),
    );
  } catch {
    /* storage unavailable — the attempt still persists on the backend */
  }
}

type FieldErrors = Partial<Record<keyof StudentIdentity, string>>;

export default function StudentEntryPage() {
  const { token } = useParams({ from: "/student/exam/$token" });
  const navigate = useNavigate();
  const assessmentQuery = useAssessmentByToken(token);
  const startAttempt = useStartAttempt();

  const [fullName, setFullName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    EducationLevel.sdMi,
  );
  const [className, setClassName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const assessment = assessmentQuery.data?.[0] ?? null;
  const questions = assessmentQuery.data?.[1] ?? [];

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (fullName.trim().length < 3) {
      next.fullName = "Nama lengkap minimal 3 karakter.";
    }
    if (className.trim().length === 0) {
      next.className = "Kelas wajib diisi.";
    }
    if (schoolName.trim().length === 0) {
      next.schoolName = "Nama sekolah wajib diisi.";
    }
    if (participantId.trim().length === 0) {
      next.participantId = "Nomor identitas peserta wajib diisi.";
    }
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const identity: StudentIdentity = {
      fullName: fullName.trim(),
      educationLevel,
      className: className.trim(),
      schoolName: schoolName.trim(),
      participantId: participantId.trim(),
    };

    startAttempt.mutate(
      { token, student: identity },
      {
        onSuccess: (attempt) => {
          if (!attempt) {
            setSubmitError(
              "Asesmen tidak tersedia atau sudah ditutup. Hubungi pengajar Anda.",
            );
            return;
          }
          storeIdentity(token, identity);
          void navigate({
            to: "/exam/$token/attempt/$attemptId",
            params: { token, attemptId: attempt.id.toString() },
          });
        },
        onError: () => {
          setSubmitError(
            "Gagal memulai pengerjaan. Periksa koneksi Anda lalu coba lagi.",
          );
        },
      },
    );
  }

  if (assessmentQuery.isLoading) {
    return (
      <section data-ocid="student_entry.page" className="space-y-6">
        <div
          data-ocid="student_entry.loading_state"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-subtle"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat asesmen…
        </div>
      </section>
    );
  }

  if (assessmentQuery.isError || !assessment) {
    return (
      <section data-ocid="student_entry.page" className="space-y-6">
        <div
          data-ocid="student_entry.error_state"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Asesmen tidak ditemukan</p>
            <p className="mt-1 text-destructive/90">
              Tautan mungkin salah atau asesmen sudah tidak aktif. Minta tautan
              terbaru kepada pengajar Anda.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ocid="student_entry.page" className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Identitas Peserta
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {assessment.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi identitas Anda sebelum mengerjakan asesmen.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-subtle md:p-7"
        >
          <div className="space-y-2">
            <label
              htmlFor="student-full-name"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Nama Lengkap
            </label>
            <input
              id="student-full-name"
              data-ocid="student_entry.full_name_input"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Contoh: Aisyah Nur Fadhilah"
            />
            {errors.fullName && (
              <p
                data-ocid="student_entry.full_name_error"
                className="text-sm text-destructive"
              >
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Jenjang
            </span>
            <div className="grid grid-cols-2 gap-3">
              {[EducationLevel.sdMi, EducationLevel.smpMts].map((level) => {
                const selected = educationLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    data-ocid={`student_entry.education_level_${level}`}
                    aria-pressed={selected}
                    onClick={() => setEducationLevel(level)}
                    className={
                      selected
                        ? "rounded-xl border border-primary bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        : "rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    }
                  >
                    {educationLevelLabel(level)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="student-class"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Kelas
              </label>
              <input
                id="student-class"
                data-ocid="student_entry.class_input"
                type="text"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                aria-invalid={Boolean(errors.className)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="Contoh: 6A"
              />
              {errors.className && (
                <p
                  data-ocid="student_entry.class_error"
                  className="text-sm text-destructive"
                >
                  {errors.className}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="student-participant-id"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Nomor Identitas Peserta
              </label>
              <input
                id="student-participant-id"
                data-ocid="student_entry.participant_id_input"
                type="text"
                value={participantId}
                onChange={(event) => setParticipantId(event.target.value)}
                aria-invalid={Boolean(errors.participantId)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="Contoh: 2024-00123"
              />
              {errors.participantId && (
                <p
                  data-ocid="student_entry.participant_id_error"
                  className="text-sm text-destructive"
                >
                  {errors.participantId}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="student-school"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Nama Sekolah
            </label>
            <input
              id="student-school"
              data-ocid="student_entry.school_input"
              type="text"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              aria-invalid={Boolean(errors.schoolName)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-smooth focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Contoh: SD Negeri 1 Sukamaju"
            />
            {errors.schoolName && (
              <p
                data-ocid="student_entry.school_error"
                className="text-sm text-destructive"
              >
                {errors.schoolName}
              </p>
            )}
          </div>

          {submitError && (
            <p
              role="alert"
              data-ocid="student_entry.submit_error"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            data-ocid="student_entry.start_button"
            disabled={startAttempt.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {startAttempt.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Menyiapkan…
              </>
            ) : (
              <>
                Mulai Mengerjakan
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Informasi Asesmen
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <ClipboardList
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    Mata Pelajaran
                  </dt>
                  <dd className="font-medium text-foreground">
                    {assessment.subject}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Jenjang</dt>
                  <dd className="font-medium text-foreground">
                    {educationLevelLabel(assessment.educationLevel)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserRound
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Kelas</dt>
                  <dd className="font-medium text-foreground">
                    {assessment.className}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <School
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Materi</dt>
                  <dd className="font-medium text-foreground">
                    {assessment.material}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">
              {questions.length} soal menanti Anda
            </p>
            <p className="mt-1">
              Tidak ada batas waktu. Jawaban tersimpan otomatis, jadi Anda bisa
              mengerjakan dengan tenang.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
