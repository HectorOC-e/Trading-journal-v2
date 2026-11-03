// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LearningReminderSettings } from "@/app/perfil/components/learning-reminder-settings";
const m = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    profile: { update: { useMutation: () => ({ mutateAsync: m.save }) } },
    useUtils: () => ({ profile: { get: { invalidate: m.invalidate } } }),
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({});
});
afterEach(cleanup);
it("shows profile timezone and saves the 24-hour time without enabling mail", async () => {
  render(
    <LearningReminderSettings
      time="19:00"
      timezone="Asia/Kathmandu"
      emailEnabled={false}
    />,
  );
  expect(screen.getByText(/Asia\/Kathmandu/)).toBeInTheDocument();
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Hora del recordatorio de aprendizaje",
    }),
    { target: { value: "06:45" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar horario" }));
  await waitFor(() =>
    expect(m.save).toHaveBeenCalledWith({ learningReminderTime: "06:45" }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("06:45");
});
it("rejects invalid times before calling the server", () => {
  render(<LearningReminderSettings time="19:00" timezone="UTC" emailEnabled />);
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Hora del recordatorio de aprendizaje",
    }),
    { target: { value: "25:99" } },
  );
  fireEvent.submit(
    screen.getByRole("button", { name: "Guardar horario" }).closest("form")!,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("HH:mm");
  expect(m.save).not.toHaveBeenCalled();
});
