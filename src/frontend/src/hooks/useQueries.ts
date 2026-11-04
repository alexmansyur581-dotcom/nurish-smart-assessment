import { createActor } from "@/backend";
import type {
  AssessmentView,
  Attempt,
  AttemptResult,
  EducationLevel,
  Id,
  MentorView,
  Question,
  StudentIdentity,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/* Password gate                                                       */
/* ------------------------------------------------------------------ */

export function useAppUnlocked() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["appUnlocked"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAppUnlocked();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUnlockApp() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.unlockApp(password);
    },
    onSuccess: (unlocked) => {
      if (unlocked) {
        void queryClient.invalidateQueries({ queryKey: ["appUnlocked"] });
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mentor identity                                                     */
/* ------------------------------------------------------------------ */

export function useCallerMentor() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["callerMentor"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerMentor();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMentorLogin() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.mentorLogin(email, password);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["callerMentor"] });
      void queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mentors (admin)                                                     */
/* ------------------------------------------------------------------ */

export function useMentors() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["mentors"],
    queryFn: async () => {
      if (!actor) return [] as MentorView[];
      return actor.listMentors();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateMentor() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.createMentor(input.email, input.password, input.displayName);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentors"] });
    },
  });
}

export function useSetMentorActive() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: Id; isActive: boolean }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.setMentorActive(id, isActive);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentors"] });
    },
  });
}

export function useDeleteMentor() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.deleteMentor(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentors"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Assessments                                                         */
/* ------------------------------------------------------------------ */

export function useAssessments() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      if (!actor) return [] as AssessmentView[];
      return actor.listAssessments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAssessment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      educationLevel: EducationLevel;
      className: string;
      subject: string;
      material: string;
      allowedAttempts: bigint;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.createAssessment(
        input.title,
        input.educationLevel,
        input.className,
        input.subject,
        input.material,
        input.allowedAttempts,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUpdateAssessment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: Id;
      title: string;
      educationLevel: EducationLevel;
      className: string;
      subject: string;
      material: string;
      allowedAttempts: bigint;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.updateAssessment(
        input.id,
        input.title,
        input.educationLevel,
        input.className,
        input.subject,
        input.material,
        input.allowedAttempts,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUploadQuestions() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      parsed,
    }: {
      assessmentId: Id;
      parsed: Question[];
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.uploadQuestions(assessmentId, parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function usePublishAssessment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.publishAssessment(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useCloseAssessment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.closeAssessment(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useDeleteAssessment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.deleteAssessment(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Student flow (share token)                                          */
/* ------------------------------------------------------------------ */

export function useAssessmentByToken(token: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["assessmentByToken", token],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAssessmentByToken(token);
    },
    enabled: !!actor && !isFetching && token.length > 0,
  });
}

export function useStartAttempt() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      token,
      student,
    }: {
      token: string;
      student: StudentIdentity;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.startAttempt(token, student);
    },
  });
}

export function useSaveAnswer() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      attemptId,
      questionId,
      response,
    }: {
      attemptId: Id;
      questionId: Id;
      response: string;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.saveAnswer(attemptId, questionId, response);
    },
  });
}

export function useSubmitAttempt() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (attemptId: Id) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.submitAttempt(attemptId);
    },
  });
}

export function useAttemptResult(attemptId: Id | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["attemptResult", attemptId?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || attemptId === null) return null;
      return actor.getAttemptResult(attemptId);
    },
    enabled: !!actor && !isFetching && attemptId !== null,
  });
}

/* ------------------------------------------------------------------ */
/* Grading                                                             */
/* ------------------------------------------------------------------ */

export function useAttempts(assessmentId: Id | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["attempts", assessmentId?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || assessmentId === null) return [] as Attempt[];
      return actor.listAttempts(assessmentId);
    },
    enabled: !!actor && !isFetching && assessmentId !== null,
  });
}

export function useGradeAnswer() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attemptId: Id;
      questionId: Id;
      awardedScore: bigint;
      comment: string | null;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.gradeAnswer(
        input.attemptId,
        input.questionId,
        input.awardedScore,
        input.comment,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attempts"] });
      void queryClient.invalidateQueries({ queryKey: ["attemptResult"] });
    },
  });
}

export function useFinalizeAttempt() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attemptId,
      mentorNote,
    }: {
      attemptId: Id;
      mentorNote: string | null;
    }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.finalizeAttempt(attemptId, mentorNote);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attempts"] });
      void queryClient.invalidateQueries({ queryKey: ["attemptResult"] });
    },
  });
}

export type { AssessmentView, Attempt, AttemptResult, MentorView, Question };
