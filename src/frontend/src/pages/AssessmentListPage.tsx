import type { AssessmentView } from "@/backend";
import { AssessmentStatus } from "@/backend";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAssessments,
  useAttempts,
  useCloseAssessment,
  useDeleteAssessment,
} from "@/hooks/useQueries";
import {
  assessmentStatusLabel,
  educationLevelLabel,
  formatDate,
} from "@/lib/format";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardList,
  FilePlus2,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

function AssessmentRow({
  assessment,
  index,
}: {
  assessment: AssessmentView;
  index: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: attempts } = useAttempts(assessment.id);
  const closeAssessment = useCloseAssessment();
  const deleteAssessment = useDeleteAssessment();

  const hasAnswers = (attempts ?? []).length > 0;
  const canClose = assessment.status === AssessmentStatus.published;

  const handleClose = () => {
    closeAssessment.mutate(assessment.id, {
      onSuccess: () => toast.success("Asesmen ditutup."),
      onError: () => toast.error("Gagal menutup asesmen."),
    });
  };

  const handleDelete = () => {
    deleteAssessment.mutate(assessment.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success("Asesmen dihapus.");
      },
      onError: () => toast.error("Gagal menghapus asesmen."),
    });
  };

  return (
    <TableRow data-ocid={`assessment_list.row.${index + 1}`}>
      <TableCell className="min-w-[14rem]">
        <p className="font-semibold text-foreground">{assessment.title}</p>
        <p className="text-xs text-muted-foreground">
          {assessment.subject} · {assessment.material}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {educationLevelLabel(assessment.educationLevel)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {assessment.className}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge
          variant={statusVariant(assessment.status)}
          className="rounded-full"
        >
          {assessmentStatusLabel(assessment.status)}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDate(assessment.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link
              to="/assessments/$assessmentId/results"
              params={{ assessmentId: assessment.id.toString() }}
              data-ocid={`assessment_list.results_button.${index + 1}`}
            >
              Hasil
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={!canClose || closeAssessment.isPending}
            onClick={handleClose}
            data-ocid={`assessment_list.close_button.${index + 1}`}
          >
            {closeAssessment.isPending ? (
              <Loader2
                className="mr-1.5 size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Lock className="mr-1.5 size-4" aria-hidden="true" />
            )}
            Tutup
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="rounded-lg"
            onClick={() => setConfirmOpen(true)}
            data-ocid={`assessment_list.delete_button.${index + 1}`}
          >
            <Trash2 className="mr-1.5 size-4" aria-hidden="true" />
            Hapus
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent
            data-ocid={`assessment_list.delete_modal.${index + 1}`}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus asesmen ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Asesmen “{assessment.title}” akan dihapus permanen. Tindakan ini
                tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {hasAnswers && (
              <div
                data-ocid={`assessment_list.delete_warning.${index + 1}`}
                className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  Asesmen ini sudah memiliki jawaban siswa. Menghapusnya juga
                  menghapus soal, tautan aktif, jawaban, dan seluruh hasil yang
                  terkait.
                </p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel
                className="rounded-lg"
                data-ocid={`assessment_list.cancel_button.${index + 1}`}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteAssessment.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  handleDelete();
                }}
                data-ocid={`assessment_list.confirm_button.${index + 1}`}
              >
                {deleteAssessment.isPending ? (
                  <Loader2
                    className="mr-1.5 size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export default function AssessmentListPage() {
  const { data: assessments, isLoading, isError } = useAssessments();
  const list = assessments ?? [];

  return (
    <section data-ocid="assessment_list.page" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Daftar Asesmen
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola seluruh asesmen yang Anda miliki.
          </p>
        </div>
        <Button asChild className="rounded-lg">
          <Link to="/assessments/new" data-ocid="assessment_list.create_button">
            <FilePlus2 className="mr-1.5 size-4" aria-hidden="true" />
            Buat Asesmen
          </Link>
        </Button>
      </header>

      {isError ? (
        <div
          data-ocid="assessment_list.error_state"
          className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
        >
          Gagal memuat daftar asesmen. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : isLoading ? (
        <div
          data-ocid="assessment_list.loading_state"
          className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-subtle"
        >
          {Array.from({ length: 4 }, (_, i) => `list-skeleton-${i}`).map(
            (id) => (
              <Skeleton key={id} className="h-14 rounded-xl" />
            ),
          )}
        </div>
      ) : list.length === 0 ? (
        <div
          data-ocid="assessment_list.empty_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-subtle"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <ClipboardList className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-foreground">
              Belum ada asesmen
            </p>
            <p className="text-sm text-muted-foreground">
              Buat asesmen pertama Anda dengan mengunggah file soal Excel.
            </p>
          </div>
          <Button asChild className="rounded-lg">
            <Link to="/assessments/new" data-ocid="assessment_list.empty_cta">
              <FilePlus2 className="mr-1.5 size-4" aria-hidden="true" />
              Buat Asesmen
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle">
          <Table data-ocid="assessment_list.table">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-[14rem]">Asesmen</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((assessment, index) => (
                <AssessmentRow
                  key={assessment.id.toString()}
                  assessment={assessment}
                  index={index}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
