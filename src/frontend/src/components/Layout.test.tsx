import { renderWithActor } from "@/__tests__/test-utils";
import type { backendInterface } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Layout } from "./Layout";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      to?: string;
    }) => <a href={props.to ?? "#"}>{children}</a>,
    useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
      select({ location: { pathname: "/" } }),
  };
});

function makeActor(
  overrides: Partial<
    Pick<backendInterface, "isCallerAdmin" | "getCallerMentor">
  > = {},
) {
  const isCallerAdmin = vi.fn<backendInterface["isCallerAdmin"]>();
  const getCallerMentor = vi.fn<backendInterface["getCallerMentor"]>();
  isCallerAdmin.mockResolvedValue(false);
  getCallerMentor.mockResolvedValue(null);
  const actor = {
    isCallerAdmin,
    getCallerMentor,
    ...overrides,
  } satisfies Pick<backendInterface, "isCallerAdmin" | "getCallerMentor">;
  return { actor, isCallerAdmin, getCallerMentor };
}

describe("Layout navigation", () => {
  it("hides the admin-only mentor menu from a mentor", async () => {
    const { actor } = makeActor();
    renderWithActor(
      <Layout>
        <p>Isi halaman</p>
      </Layout>,
      actor,
    );

    expect(await screen.findByText("Isi halaman")).toBeInTheDocument();
    expect(screen.getByText("Daftar Asesmen")).toBeInTheDocument();
    expect(screen.queryByText("Kelola Mentor")).not.toBeInTheDocument();
  });

  it("shows the admin-only mentor menu to an admin", async () => {
    const { actor, isCallerAdmin } = makeActor();
    isCallerAdmin.mockResolvedValue(true);
    renderWithActor(
      <Layout>
        <p>Isi halaman</p>
      </Layout>,
      actor,
    );

    await waitFor(() =>
      expect(screen.getByText("Kelola Mentor")).toBeInTheDocument(),
    );
  });
});
