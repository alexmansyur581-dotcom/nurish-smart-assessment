import { AttemptStatus, createActor } from "@/backend";
import type { AssessmentView, Attempt, AttemptResult } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssessments, useAttempts } from "@/hooks/useQueries";
import {
  attemptStatusLabel,
  educationLevelLabel,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { useParams } from "@tanstack/react-router";
import { AlertCircle, Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* PDF document                                                        */
/* ------------------------------------------------------------------ */

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1c2b26",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#2f6b5e",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#2f6b5e",
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 5,
  },
  brandName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#1c2b26",
    letterSpacing: 0.5,
  },
  brandTag: { fontSize: 8, color: "#5c6b66", marginTop: 1 },
  docTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#2f6b5e",
    textAlign: "right",
  },
  docMeta: { fontSize: 8, color: "#5c6b66", textAlign: "right", marginTop: 2 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#2f6b5e",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  section: { marginBottom: 16 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCell: { width: "50%", marginBottom: 6, paddingRight: 8 },
  infoLabel: { fontSize: 8, color: "#5c6b66", marginBottom: 1 },
  infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1c2b26" },
  table: {
    borderWidth: 1,
    borderColor: "#d5ddd9",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e6ebe8",
  },
  tableRowLast: { flexDirection: "row" },
  tableHeadCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#eef3f1",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#2f6b5e",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 10,
    color: "#1c2b26",
  },
  tableCellStrong: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1c2b26",
  },
  scoreRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  scoreCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d5ddd9",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#f7faf9",
  },
  scoreCardHighlight: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2f6b5e",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#eef3f1",
  },
  scoreLabel: { fontSize: 8, color: "#5c6b66", marginBottom: 2 },
  scoreValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1c2b26" },
  scoreValueHighlight: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2f6b5e",
  },
  noteBox: {
    borderWidth: 1,
    borderColor: "#d5ddd9",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#f7faf9",
  },
  noteText: { fontSize: 10, color: "#1c2b26", lineHeight: 1.5 },
  noteEmpty: { fontSize: 10, color: "#8a9793", fontStyle: "italic" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#d5ddd9",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: "#8a9793" },
});

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.infoCell}>
      <Text style={pdfStyles.infoLabel}>{label}</Text>
      <Text style={pdfStyles.infoValue}>{value}</Text>
    </View>
  );
}

function ScoreCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={highlight ? pdfStyles.scoreCardHighlight : pdfStyles.scoreCard}
    >
      <Text style={pdfStyles.scoreLabel}>{label}</Text>
      <Text
        style={highlight ? pdfStyles.scoreValueHighlight : pdfStyles.scoreValue}
      >
        {value}
      </Text>
    </View>
  );
}

function AttemptReportDocument({
  assessment,
  result,
  generatedAt,
}: {
  assessment: AssessmentView | null;
  result: AttemptResult;
  generatedAt: string;
}) {
  const finalScore = Number(result.finalScore);
  const student = result.student;

  return (
    <Document
      title={`Laporan Hasil Asesmen - ${student.fullName}`}
      author="NURISH SMART"
      subject="Laporan Hasil Asesmen"
    >
      <Page size="A4" style={pdfStyles.page} wrap>
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.brandRow}>
            <Text style={pdfStyles.brandMark}>N</Text>
            <View>
              <Text style={pdfStyles.brandName}>NURISH SMART</Text>
              <Text style={pdfStyles.brandTag}>
                Platform Asesmen Pembelajaran
              </Text>
            </View>
          </View>
          <View>
            <Text style={pdfStyles.docTitle}>Laporan Hasil Asesmen</Text>
            <Text style={pdfStyles.docMeta}>Dibuat {generatedAt}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Identitas Siswa</Text>
          <View style={pdfStyles.infoGrid}>
            <InfoCell label="Nama Lengkap" value={student.fullName} />
            <InfoCell
              label="Nomor Identitas Peserta"
              value={student.participantId}
            />
            <InfoCell
              label="Jenjang"
              value={educationLevelLabel(student.educationLevel)}
            />
            <InfoCell label="Kelas" value={student.className} />
            <InfoCell label="Nama Sekolah" value={student.schoolName} />
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Informasi Asesmen</Text>
          <View style={pdfStyles.infoGrid}>
            <InfoCell label="Judul Asesmen" value={assessment?.title ?? "—"} />
            <InfoCell
              label="Mata Pelajaran"
              value={assessment?.subject ?? "—"}
            />
            <InfoCell label="Materi" value={assessment?.material ?? "—"} />
            <InfoCell
              label="Jenjang / Kelas"
              value={
                assessment
                  ? `${educationLevelLabel(assessment.educationLevel)} · ${assessment.className}`
                  : "—"
              }
            />
            <InfoCell
              label="Tanggal Pengumpulan"
              value={
                result.submittedAt !== undefined
                  ? formatDateTime(result.submittedAt)
                  : "Belum dikumpulkan"
              }
            />
            <InfoCell
              label="Status"
              value={attemptStatusLabel(result.status)}
            />
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Rekapitulasi Jawaban</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableHeadCell}>Jumlah Soal</Text>
              <Text style={pdfStyles.tableHeadCell}>Benar</Text>
              <Text style={pdfStyles.tableHeadCell}>Salah</Text>
              <Text style={pdfStyles.tableHeadCell}>Tidak Dijawab</Text>
            </View>
            <View style={pdfStyles.tableRowLast}>
              <Text style={pdfStyles.tableCellStrong}>
                {result.totalQuestions.toString()}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {result.correctCount.toString()}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {result.wrongCount.toString()}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {result.unansweredCount.toString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Perolehan Nilai</Text>
          <View style={pdfStyles.scoreRow}>
            <ScoreCard
              label="Nilai Objektif"
              value={result.objectiveScore.toString()}
            />
            <ScoreCard
              label="Nilai Manual"
              value={result.manualScore.toString()}
            />
            <ScoreCard
              label="Nilai Akhir"
              value={finalScore.toFixed(1)}
              highlight
            />
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>
            Catatan &amp; Rekomendasi Mentor
          </Text>
          <View style={pdfStyles.noteBox}>
            {result.mentorNote && result.mentorNote.trim().length > 0 ? (
              <Text style={pdfStyles.noteText}>{result.mentorNote}</Text>
            ) : (
              <Text style={pdfStyles.noteEmpty}>
                Belum ada catatan dari mentor untuk pengerjaan ini.
              </Text>
            )}
          </View>
        </View>

        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            NURISH SMART · Laporan Hasil Asesmen
          </Text>
          <Text
            style={pdfStyles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} dari ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(
  status: Attempt["status"],
): "default" | "secondary" | "outline" {
  switch (status) {
    case AttemptStatus.graded:
      return "default";
    case AttemptStatus.awaitingReview:
      return "secondary";
    default:
      return "outline";
  }
}

export default function AssessmentResultsPage() {
  const params = useParams({ strict: false }) as { assessmentId?: string };
  const assessmentId =
    params.assessmentId !== undefined ? BigInt(params.assessmentId) : null;

  const { actor } = useActor(createActor);
  const { data: assessments } = useAssessments();
  const { data: attempts, isLoading, isError } = useAttempts(assessmentId);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const assessment =
    assessments?.find((item) => item.id === assessmentId) ?? null;

  async function handleDownload(attempt: Attempt) {
    if (!actor) {
      toast.error("Backend belum siap. Coba lagi sebentar.");
      return;
    }
    const key = attempt.id.toString();
    setDownloadingId(key);
    try {
      const result = await actor.getAttemptResult(attempt.id);
      if (!result) {
        toast.error("Hasil pengerjaan belum tersedia untuk diunduh.");
        return;
      }
      const generatedAt = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      const blob = await pdf(
        <AttemptReportDocument
          assessment={assessment}
          result={result}
          generatedAt={generatedAt}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = attempt.student.fullName
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      link.href = url;
      link.download = `laporan-asesmen-${safeName || "siswa"}-${key}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Laporan PDF berhasil diunduh.");
    } catch {
      toast.error("Gagal membuat laporan PDF. Silakan coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  }

  const sortedAttempts = [...(attempts ?? [])].sort((a, b) =>
    a.student.fullName.localeCompare(b.student.fullName, "id"),
  );

  return (
    <section data-ocid="assessment_results.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Hasil Asesmen
        </h1>
        <p className="text-sm text-muted-foreground">
          {assessment
            ? `${assessment.title} · ${assessment.subject} · ${assessment.className}`
            : "Tinjau hasil pengerjaan siswa untuk asesmen ini."}
        </p>
      </header>

      {isLoading && (
        <div
          data-ocid="assessment_results.loading_state"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-subtle"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat hasil asesmen…
        </div>
      )}

      {isError && (
        <div
          data-ocid="assessment_results.error_state"
          className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Gagal memuat hasil asesmen. Muat ulang halaman untuk mencoba lagi.
          </p>
        </div>
      )}

      {!isLoading && !isError && sortedAttempts.length === 0 && (
        <div
          data-ocid="assessment_results.empty_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-subtle"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-foreground">
              Belum ada pengerjaan
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Hasil akan muncul di sini setelah siswa mengerjakan asesmen ini
              melalui tautan yang dibagikan.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && sortedAttempts.length > 0 && (
        <div
          data-ocid="assessment_results.table"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4">Siswa</TableHead>
                <TableHead className="hidden px-4 md:table-cell">
                  Sekolah
                </TableHead>
                <TableHead className="px-4">Tanggal Kumpul</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Laporan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAttempts.map((attempt, index) => {
                const key = attempt.id.toString();
                const isDownloading = downloadingId === key;
                return (
                  <TableRow
                    key={key}
                    data-ocid={`assessment_results.row.${index + 1}`}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {attempt.student.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {attempt.student.participantId} ·{" "}
                          {educationLevelLabel(attempt.student.educationLevel)}{" "}
                          {attempt.student.className}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {attempt.student.schoolName}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {attempt.submittedAt !== undefined
                        ? formatDate(attempt.submittedAt)
                        : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(attempt.status)}>
                        {attemptStatusLabel(attempt.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-ocid={`assessment_results.download_button.${index + 1}`}
                        disabled={isDownloading}
                        onClick={() => void handleDownload(attempt)}
                      >
                        {isDownloading ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Download className="size-4" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">
                          {isDownloading ? "Menyiapkan…" : "Unduh PDF"}
                        </span>
                        <span className="sr-only sm:hidden">Unduh PDF</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
