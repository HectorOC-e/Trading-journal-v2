// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { PracticesTab } from "@/app/aprendizaje/components/practices-tab";
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    learningPractices: {
      list: {
        useInfiniteQuery: () => ({
          data: { pages: [{ items: [], nextCursor: null }] },
          refetch: vi.fn(),
        }),
      },
      summary: {
        useQuery: () => ({
          data: { minutes: 0, sessions: 0, today: "2026-11-03" },
        }),
      },
    },
    learningResources: { list: { useQuery: () => ({ data: [] }) } },
    useUtils: () => ({ learningPractices: { invalidate: vi.fn() } }),
  },
}));
vi.mock("@/app/aprendizaje/modals/practice-modal", () => ({
  PracticeModal: () => null,
}));
it("offers registering and clearing filters when no practice matches", () => {
  render(<PracticesTab />);
  expect(
    screen.getByRole("button", { name: "Registrar práctica" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Desde"), {
    target: { value: "2026-01-01" },
  });
  expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeTruthy();
  expect(screen.getByText("No hay prácticas con estos filtros.")).toBeTruthy();
});
