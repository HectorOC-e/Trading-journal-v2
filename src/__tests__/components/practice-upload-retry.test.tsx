// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { PracticeModal } from "@/app/aprendizaje/modals/practice-modal";
const m = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    learningResources: { list: { useQuery: () => ({ data: [] }) } },
    learningPractices: new Proxy(
      {},
      { get: () => ({ useMutation: () => ({ mutateAsync: vi.fn() }) }) },
    ),
    useUtils: () => ({ learningPractices: { get: { fetch: m.get } } }),
  },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("retries the same upload operation after saved image refresh fails", async () => {
  const row = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Zonas",
    date: "2026-11-02",
    durationMin: 30,
    exercise: "Cinco zonas",
    reflection: "",
    resourceId: null,
    version: 1,
    attachments: [],
    feedback: [],
  };
  m.get
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ ...row, version: 2 });
  const fetcher = vi
    .fn()
    .mockImplementation(
      async (_url, options) =>
        new Response(
          JSON.stringify(
            options?.method === "POST" ? { version: 2 } : { files: [] },
          ),
        ),
    );
  vi.stubGlobal("fetch", fetcher);
  render(
    <PracticeModal
      record={row as never}
      today="2026-11-03"
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Añadir captura"), {
    target: { files: [new File(["image"], "a.png", { type: "image/png" })] },
  });
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("offline"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reintentar captura" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Reintentar captura" }),
    ).toBeNull(),
  );
  const posts = fetcher.mock.calls.filter(([, o]) => o?.method === "POST");
  expect(posts).toHaveLength(2);
  expect(posts[0][1].body.get("uploadId")).toBe(
    posts[1][1].body.get("uploadId"),
  );
});
