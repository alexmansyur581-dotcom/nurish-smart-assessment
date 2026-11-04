import { renderWithActor } from "@/__tests__/test-utils";
import type { backendInterface } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// The real router mounts the whole route tree; render a sentinel for the
// default route so this test observes the app shell and gate, not routing.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    RouterProvider: () => <p>Dashboard default route</p>,
  };
});

function makeActor(
  overrides: Partial<
    Pick<backendInterface, "isAppUnlocked" | "unlockApp">
  > = {},
) {
  const isAppUnlocked = vi.fn<backendInterface["isAppUnlocked"]>();
  const unlockApp = vi.fn<backendInterface["unlockApp"]>();
  isAppUnlocked.mockResolvedValue(false);
  unlockApp.mockResolvedValue(false);
  const actor = {
    isAppUnlocked,
    unlockApp,
    ...overrides,
  } satisfies Pick<backendInterface, "isAppUnlocked" | "unlockApp">;
  return { actor, isAppUnlocked, unlockApp };
}

describe("App", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders the password gate instead of a blank screen on the default route", async () => {
    const { actor } = makeActor();

    renderWithActor(<App />, actor);

    expect(await screen.findByTestId("password_gate.page")).toBeInTheDocument();
    expect(
      screen.queryByText("Dashboard default route"),
    ).not.toBeInTheDocument();
  });

  it("reveals the default route once the shared password is accepted", async () => {
    const user = userEvent.setup();
    const { actor, unlockApp } = makeActor();
    unlockApp.mockResolvedValue(true);

    renderWithActor(<App />, actor);

    await user.type(
      await screen.findByTestId("password_gate.input"),
      "B4kung4n",
    );
    await user.click(screen.getByTestId("password_gate.submit_button"));

    await waitFor(() =>
      expect(screen.getByText("Dashboard default route")).toBeInTheDocument(),
    );
  });
});
