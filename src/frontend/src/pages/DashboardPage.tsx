import { AssessmentStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAssessments,
  useCallerMentor,
  useIsCallerAdmin,
} from "@/hooks/useQueries";
import { assessmentStatusLabel, formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  FilePlus2,
  GraduationCap,
  Users,
} from "lucide-react";

type QuickAction = {
  to: string;
  label: string;
  description: string;
  icon: typeof FilePlus2;
  adminOnly?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: "/assessments/new",
    label: "Buat Asesmen",
    description: "Unggah soal dari file Excel dan terbitkan tautan siswa.",
    icon: FilePlus2,
  },
  {
    to: "/assessments",
    label: "Daftar Asesmen",
    description: "Kelola, tutup, atau hapus asesmen yang sudah dibuat.",
    icon: ClipboardList,
  },
  {
    to: "/mentors",
    label: "Kelola Mentor",
    description: "Tambah dan atur akun mentor pengajar.",
    icon: Users,
    adminOnly: true,
  },
];

function statusVariant(status: AssessmentStatus) {
  switch (status) {
    case AssessmentStatus.published:
      return "default" as const;
    case AssessmentStatus.closed:
      return "secondary" as const;
    case AssessmentStatus.draft:
      return "outline" as const;
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="rounded-2xl border-border shadow-subtle">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-semibold uppercase tracking-widest">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: assessments, isLoading, isError } = useAssessments();
  const { data: mentor } = useCallerMentor();
  const { data: isAdmin } = useIsCallerAdmin();

  const list = assessments ?? [];
  const total = list.length;
  const active = list.filter(
    (item) => item.status === AssessmentStatus.published,
  ).length;
  const draft = list.filter(
    (item) => item.status === AssessmentStatus.draft,
  ).length;
  const closed = list.filter(
    (item) => item.status === AssessmentStatus.closed,
  ).length;

  const recent = [...list]
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .slice(0, 5);

  const greetingName = mentor?.displayName ?? (isAdmin ? "Administrator" : "");
  const actions = QUICK_ACTIONS.filter(
    (action) => !action.adminOnly || isAdmin,
  );

  return (
    <section data-ocid="dashboard.page" className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {greetingName
            ? `Selamat datang kembali, ${greetingName}. Ringkasan asesmen Anda ada di sini.`
            : "Ringkasan asesmen dan aktivitas penilaian Anda."}
        </p>
      </header>

      {isError ? (
        <div
          data-ocid="dashboard.error_state"
          className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
        >
          Gagal memuat ringkasan asesmen. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : isLoading ? (
        <div
          data-ocid="dashboard.loading_state"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => `stat-skeleton-${i}`).map(
            (id) => (
              <Skeleton key={id} className="h-28 rounded-2xl" />
            ),
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Asesmen"
            value={String(total)}
            hint={isAdmin ? "Seluruh asesmen" : "Milik Anda"}
          />
          <StatCard
            label="Aktif"
            value={String(active)}
            hint="Tautan siswa terbuka"
          />
          <StatCard
            label="Draft"
            value={String(draft)}
            hint="Belum diterbitkan"
          />
          <StatCard
            label="Selesai"
            value={String(closed)}
            hint="Sudah ditutup"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="rounded-2xl border-border shadow-subtle lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="font-display text-lg">
                Asesmen Terbaru
              </CardTitle>
              <CardDescription>
                Lima asesmen yang paling baru dibuat.
              </CardDescription>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-lg text-primary"
            >
              <Link to="/assessments" data-ocid="dashboard.view_all_link">
                Lihat semua
                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => `row-skeleton-${i}`).map(
                  (id) => (
                    <Skeleton key={id} className="h-14 rounded-xl" />
                  ),
                )}
              </div>
            ) : recent.length === 0 ? (
              <div
                data-ocid="dashboard.empty_state"
                className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <ClipboardList className="size-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-display text-sm font-semibold text-foreground">
                    Belum ada asesmen
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mulai dengan membuat asesmen pertama Anda.
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-lg">
                  <Link to="/assessments/new" data-ocid="dashboard.empty_cta">
                    Buat Asesmen
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((item, index) => (
                  <li
                    key={item.id.toString()}
                    data-ocid={`dashboard.recent_item.${index + 1}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subject} · Kelas {item.className} ·{" "}
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={statusVariant(item.status)}
                      className="shrink-0 rounded-full"
                    >
                      {assessmentStatusLabel(item.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-subtle lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="font-display text-lg">Aksi Cepat</CardTitle>
            <CardDescription>
              Langkah utama untuk mengelola asesmen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  data-ocid={`dashboard.quick_action.${action.to.replace(/\//g, "_").replace(/^_/, "")}`}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-smooth hover:border-primary/40 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-smooth group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {action.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </Link>
              );
            })}
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Hasil Asesmen
                </span>
                <span className="block text-xs text-muted-foreground">
                  Buka hasil dari tombol pada tiap baris di Daftar Asesmen.
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
