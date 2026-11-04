import type { MentorView } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useCreateMentor,
  useDeleteMentor,
  useIsCallerAdmin,
  useMentors,
  useSetMentorActive,
} from "@/hooks/useQueries";
import { formatDate } from "@/lib/format";
import { Loader2, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

const SKELETON_IDS = Array.from(
  { length: 4 },
  (_, i) => `mentor-skeleton-${i}`,
);

function MentorRow({
  mentor,
  index,
  onToggleActive,
  onRequestDelete,
  isToggling,
}: {
  mentor: MentorView;
  index: number;
  onToggleActive: (mentor: MentorView) => void;
  onRequestDelete: (mentor: MentorView) => void;
  isToggling: boolean;
}) {
  return (
    <TableRow data-ocid={`mentor_management.row.${index + 1}`}>
      <TableCell className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {mentor.displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{mentor.email}</p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {formatDate(mentor.createdAt)}
        </span>
      </TableCell>
      <TableCell>
        <Badge
          variant={mentor.isActive ? "default" : "secondary"}
          data-ocid={`mentor_management.status.${index + 1}`}
        >
          {mentor.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isToggling}
            data-ocid={`mentor_management.toggle_button.${index + 1}`}
            onClick={() => onToggleActive(mentor)}
          >
            {isToggling ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {mentor.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Hapus akun ${mentor.displayName}`}
            data-ocid={`mentor_management.delete_button.${index + 1}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRequestDelete(mentor)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function MentorManagementPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: mentors, isLoading, isError } = useMentors();
  const createMentor = useCreateMentor();
  const setMentorActive = useSetMentorActive();
  const deleteMentor = useDeleteMentor();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MentorView | null>(null);
  const [togglingId, setTogglingId] = useState<bigint | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    displayName.trim().length > 0 &&
    password.length >= 6;

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || createMentor.isPending) return;
    const draft = {
      email: email.trim(),
      displayName: displayName.trim(),
      password,
    };
    setEmail("");
    setDisplayName("");
    setPassword("");
    createMentor.mutate(draft, {
      onSuccess: () => toast.success("Akun mentor berhasil dibuat."),
      onError: () =>
        toast.error("Gagal membuat akun mentor. Periksa kembali datanya."),
    });
  }

  function handleToggleActive(mentor: MentorView) {
    setTogglingId(mentor.id);
    setMentorActive.mutate(
      { id: mentor.id, isActive: !mentor.isActive },
      {
        onSuccess: () =>
          toast.success(
            mentor.isActive
              ? "Akun mentor dinonaktifkan."
              : "Akun mentor diaktifkan.",
          ),
        onError: () => toast.error("Gagal mengubah status akun mentor."),
        onSettled: () => setTogglingId(null),
      },
    );
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    deleteMentor.mutate(target.id, {
      onSuccess: () => toast.success("Akun mentor dihapus."),
      onError: () => toast.error("Gagal menghapus akun mentor."),
    });
  }

  if (isAdminLoading) {
    return (
      <section data-ocid="mentor_management.page" className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section data-ocid="mentor_management.page" className="space-y-6">
        <Card
          data-ocid="mentor_management.forbidden_state"
          className="rounded-2xl border-border shadow-subtle"
        >
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" aria-hidden="true" />
            </span>
            <h1 className="font-display text-xl font-bold text-foreground">
              Akses khusus admin
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Halaman Kelola Mentor hanya dapat dibuka oleh akun administrator.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section data-ocid="mentor_management.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Kelola Mentor
        </h1>
        <p className="text-sm text-muted-foreground">
          Tambah, aktifkan, atau hapus akun mentor.
        </p>
      </header>

      <Card className="rounded-2xl border-border shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5 text-primary" aria-hidden="true" />
            Tambah Mentor Baru
          </CardTitle>
          <CardDescription>
            Akun mentor dapat langsung masuk setelah dibuat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreate}
            data-ocid="mentor_management.create_form"
            className="grid gap-4 md:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="mentor-name">Nama tampilan</Label>
              <Input
                id="mentor-name"
                data-ocid="mentor_management.name_input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Mis. Bu Sari"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mentor-email">Email</Label>
              <Input
                id="mentor-email"
                type="email"
                data-ocid="mentor_management.email_input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@sekolah.id"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mentor-password">Kata sandi</Label>
              <Input
                id="mentor-password"
                type="password"
                data-ocid="mentor_management.password_input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-3">
              <Button
                type="submit"
                data-ocid="mentor_management.submit_button"
                disabled={!canSubmit || createMentor.isPending}
                className="w-full sm:w-auto"
              >
                {createMentor.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {createMentor.isPending ? "Menyimpan…" : "Tambah Mentor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-subtle">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Mentor</CardTitle>
          <CardDescription>
            {mentors ? `${mentors.length} akun mentor terdaftar.` : "Memuat…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {isLoading ? (
            <div
              data-ocid="mentor_management.loading_state"
              className="space-y-3 px-6 md:px-0"
            >
              {SKELETON_IDS.map((id) => (
                <Skeleton key={id} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p
              data-ocid="mentor_management.error_state"
              className="px-6 text-sm text-destructive md:px-0"
            >
              Gagal memuat daftar mentor. Coba muat ulang halaman.
            </p>
          ) : !mentors || mentors.length === 0 ? (
            <div
              data-ocid="mentor_management.empty_state"
              className="flex flex-col items-center gap-2 px-6 py-10 text-center md:px-0"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserPlus className="size-6" aria-hidden="true" />
              </span>
              <p className="font-medium text-foreground">Belum ada mentor</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Tambahkan akun mentor pertama melalui formulir di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="mentor_management.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Dibuat
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mentors.map((mentor, index) => (
                    <MentorRow
                      key={mentor.id.toString()}
                      mentor={mentor}
                      index={index}
                      isToggling={togglingId === mentor.id}
                      onToggleActive={handleToggleActive}
                      onRequestDelete={setPendingDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent data-ocid="mentor_management.delete_dialog">
          <DialogHeader>
            <DialogTitle>Hapus akun mentor?</DialogTitle>
            <DialogDescription>
              Akun{" "}
              <span className="font-medium text-foreground">
                {pendingDelete?.displayName}
              </span>{" "}
              akan dihapus permanen dan tidak dapat masuk lagi. Tindakan ini
              tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="mentor_management.cancel_button"
              onClick={() => setPendingDelete(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="mentor_management.confirm_button"
              disabled={deleteMentor.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMentor.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
