# Project Guidance

## User Preferences

- Tampilan modern, sederhana, rapi, dan mudah digunakan
- Responsif di HP maupun komputer
- Menggunakan identitas visual NURISH SMART
- Hindari tampilan yang terlalu ramai dan fitur tambahan yang tidak diperlukan
- Setiap tombol atau fitur yang tampil harus benar-benar berfungsi

## Accepted Requirements

- Gerbang password umum 'B4kung4n' melindungi seluruh halaman aplikasi, diverifikasi di sisi server.
- Tiga peran: admin (akses penuh), mentor (akun, hanya data miliknya), siswa (tanpa akun, akses via tautan).
- Dashboard dengan menu Dashboard, Daftar Asesmen, Buat Asesmen, Hasil Asesmen, dan Kelola Mentor (khusus admin).
- Informasi asesmen menampilkan judul, jenjang, kelas, mata pelajaran, materi, status, dan tanggal pembuatan; tanpa jumlah soal atau durasi.
- Pembuatan asesmen dengan unggah file Excel .xlsx dan template yang dapat diunduh (9 kolom).
- Empat jenis soal: pilihan ganda, Benar/Salah, isian singkat, dan esai.
- Validasi file menampilkan nomor soal dan jenis kesalahan; pratinjau soal sebelum penerbitan.
- Tautan unik asesmen yang dapat disalin dan dibagikan manual kepada siswa.
- Mentor dapat melihat, mengedit, menutup, dan menghapus asesmen miliknya; admin pada seluruh asesmen.
- Konfirmasi Batal/Hapus dengan peringatan penghapusan data terkait jika sudah ada jawaban siswa.
- Siswa mengisi identitas (nama lengkap, jenjang, kelas, nama sekolah, nomor identitas peserta) sebelum mengerjakan.
- Halaman pengerjaan dengan navigasi soal, penanda sudah/belum dijawab, dan progres.
- Tanpa batas waktu pengerjaan.
- Autosave jawaban ke database; identitas dan jawaban tetap tersedia setelah muat ulang.
- Pemberitahuan saat koneksi terputus dan penyimpanan ulang saat koneksi kembali.
- Konfirmasi sebelum mengumpulkan; jawaban terkunci setelah dikumpulkan.
- Jumlah kesempatan mengerjakan dapat diatur mentor.
- Pemeriksaan otomatis pilihan ganda dan Benar/Salah; penilaian manual isian singkat dan esai dengan komentar.
- Nilai akhir = (Total Nilai Diperoleh ÷ Total Bobot) × 100.
- Status pengerjaan: Sedang Dikerjakan, Menunggu Pemeriksaan, Selesai Dinilai.
- Hasil akhir hanya tampil setelah seluruh penilaian manual selesai.
- Kunci jawaban dan pembahasan tidak ditampilkan kepada siswa.
- Laporan PDF A4 dengan identitas NURISH SMART berisi identitas siswa, informasi asesmen, tanggal, jumlah soal, benar/salah/tidak dijawab, nilai objektif, nilai manual, nilai akhir, serta catatan mentor.
- Siswa hanya dapat melihat laporan miliknya sendiri.
- Database permanen untuk akun, asesmen, soal, kunci, identitas siswa, jawaban, hasil, nilai, dan catatan.
- Pembatasan akses: mentor tidak melihat data mentor lain; siswa tidak mengakses data siswa lain atau kunci jawaban.
- Identitas unik untuk setiap asesmen dan pengerjaan siswa.

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Backend commands run from src/backend/: mops check --fix, mops build. Frontend commands run from src/frontend/: pnpm typecheck, pnpm fix. Bindings: pnpm bindgen from root.
- The backend exposes unlockApp, isAppUnlocked, getApiDoc, schema, execute, listMentors, createMentor, setMentorActive, deleteMentor, mentorLogin, getCallerMentor, listAssessments, createAssessment, updateAssessment, uploadQuestions, publishAssessment, closeAssessment, deleteAssessment, getAssessmentByToken, startAttempt, saveAnswer, submitAttempt, gradeAnswer, finalizeAttempt, listAttempts, getAttemptResult.
- src/frontend/src/hooks/useQueries.ts holds the shared React Query hooks and src/frontend/src/lib/format.ts holds the shared formatting helpers; page tasks consume them.
- Attempt ownership is enforced by AttemptsLib.canAccess(isAdmin, caller, attempt, assessment); the owner is the creating caller, so a URL attempt id no longer leaks another student's result.
- Nat64.toNat8 traps when the value exceeds 255; mask with & 0xff before converting an extracted byte in the password hashing helper.
- Tailwind sidebar/foreground/background tokens lack <alpha-value>, so opacity modifiers like text-sidebar-foreground/75 silently fail; use solid tokens.
- The template mounts no Toaster; mount <Toaster /> from @/components/ui/sonner in App.tsx because main.tsx is protected.
- Added xlsx (SheetJS) for browser .xlsx read/write and @react-pdf/renderer for A4 PDF reports.
- AttemptResult.finalScore is already the 0-100 final score; render it directly, do not recompute it.
