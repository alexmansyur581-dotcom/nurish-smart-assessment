import { renderWithActor } from "@/__tests__/test-utils";
import type { backendInterface } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordGate } from "./PasswordGate";

const SESSION_KEY = "nurish-smart-unlocked";

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

describe("PasswordGate", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("blocks the protected content until the server accepts the password", async () => {
    const user = userEvent.setup();
    const { actor, unlockApp } = makeActor();
    unlockApp.mockResolvedValue(true);

    renderWithActor(
      <PasswordGate>
        <p>Konten rahasia</p>
      </PasswordGate>,
      actor,
    );

    expect(screen.queryByText("Konten rahasia")).not.toBeInTheDocument();
    expect(screen.getByTestId("password_gate.page")).toBeInTheDocument();

    await user.type(screen.getByTestId("password_gate.input"), "B4kung4n");
    await user.click(screen.getByTestId("password_gate.submit_button"));

    await waitFor(() =>
      expect(screen.getByText("Konten rahasia")).toBeInTheDocument(),
    );
    expect(unlockApp).toHaveBeenCalledWith("B4kung4n");
  });

  it("shows an error and keeps the gate closed when the password is rejected", async () => {
    const user = userEvent.setup();
    const { actor, unlockApp } = makeActor();
    unlockApp.mockResolvedValue(false);

    renderWithActor(
      <PasswordGate>
        <p>Konten rahasia</p>
      </PasswordGate>,
      actor,
    );

    await user.type(screen.getByTestId("password_gate.input"), "salah");
    await user.click(screen.getByTestId("password_gate.submit_button"));

    expect(
      await screen.findByTestId("password_gate.error_state"),
    ).toHaveTextContent("Kata sandi salah");
    expect(screen.queryByText("Konten rahasia")).not.toBeInTheDocument();
  });

  it("rejects an empty password without calling the server", async () => {
    const user = userEvent.setup();
    const { actor, unlockApp } = makeActor();

    renderWithActor(
      <PasswordGate>
        <p>Konten rahasia</p>
      </PasswordGate>,
      actor,
    );

    await user.click(screen.getByTestId("password_gate.submit_button"));

    expect(
      await screen.findByTestId("password_gate.error_state"),
    ).toBeInTheDocument();
    expect(unlockApp).not.toHaveBeenCalled();
  });

  it("stays unlocked for the session once the server reports it unlocked", async () => {
    const { actor, isAppUnlocked } = makeActor();
    isAppUnlocked.mockResolvedValue(true);

    renderWithActor(
      <PasswordGate>
        <p>Konten rahasia</p>
      </PasswordGate>,
      actor,
    );

    expect(await screen.findByText("Konten rahasia")).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
