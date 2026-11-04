import { RequireSignIn } from "@/components/InternetIdentity";
import { Layout } from "@/components/Layout";
import { PasswordGate } from "@/components/PasswordGate";
import { Toaster } from "@/components/ui/sonner";
import AssessmentCreatePage from "@/pages/AssessmentCreatePage";
import AssessmentListPage from "@/pages/AssessmentListPage";
import AssessmentResultsPage from "@/pages/AssessmentResultsPage";
import AssessmentReviewPage from "@/pages/AssessmentReviewPage";
import DashboardPage from "@/pages/DashboardPage";
import MentorManagementPage from "@/pages/MentorManagementPage";
import StudentEntryPage from "@/pages/StudentEntryPage";
import StudentExamPage from "@/pages/StudentExamPage";
import StudentResultPage from "@/pages/StudentResultPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

/** Staff shell: sidebar + header, gated behind Internet Identity sign-in. */
function StaffLayout() {
  return (
    <RequireSignIn>
      <Layout>
        <Outlet />
      </Layout>
    </RequireSignIn>
  );
}

/** Student shell: no account required, only the shared password gate. */
function StudentLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

const rootRoute = createRootRoute();

const staffRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "staff",
  component: StaffLayout,
});

const studentRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "student",
  component: StudentLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "/",
  component: DashboardPage,
});

const assessmentListRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "/assessments",
  component: AssessmentListPage,
});

const assessmentCreateRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "/assessments/new",
  component: AssessmentCreatePage,
});

const assessmentResultsRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "/assessments/$assessmentId/results",
  component: AssessmentResultsPage,
});

const assessmentReviewRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "/assessments/$assessmentId/attempts/$attemptId",
  component: AssessmentReviewPage,
});

const mentorManagementRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "/mentors",
  component: MentorManagementPage,
});

const studentEntryRoute = createRoute({
  getParentRoute: () => studentRoute,
  path: "/exam/$token",
  component: StudentEntryPage,
});

const studentExamRoute = createRoute({
  getParentRoute: () => studentRoute,
  path: "/exam/$token/attempt/$attemptId",
  component: StudentExamPage,
});

const studentResultRoute = createRoute({
  getParentRoute: () => studentRoute,
  path: "/exam/$token/result/$attemptId",
  component: StudentResultPage,
});

const routeTree = rootRoute.addChildren([
  staffRoute.addChildren([
    dashboardRoute,
    assessmentListRoute,
    assessmentCreateRoute,
    assessmentResultsRoute,
    assessmentReviewRoute,
    mentorManagementRoute,
  ]),
  studentRoute.addChildren([
    studentEntryRoute,
    studentExamRoute,
    studentResultRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <PasswordGate>
      <RouterProvider router={router} />
      <Toaster />
    </PasswordGate>
  );
}
