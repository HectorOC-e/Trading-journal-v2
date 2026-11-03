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

it("shows assistant comment time in the profile timezone", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ files: [] }))),
  );
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
    feedback: [
      {
        id: "f",
        kind: "feedback",
        version: 1,
        text: "Observaciones",
        createdAt: "2026-11-03T01:30:00Z",
      },
    ],
  };
  render(
    <PracticeModal
      record={row as never}
      today="2026-11-03"
      timezone="America/Tegucigalpa"
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  expect(screen.getByText(/2\/11\/2026.*19:30/)).toBeInTheDocument();
});

it("rejects images over 4 MB before sending a request to Vercel", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ files: [] })));
  vi.stubGlobal("fetch", fetcher);
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
  render(
    <PracticeModal
      record={row as never}
      today="2026-11-03"
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Añadir captura"), {
    target: {
      files: [
        new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", {
          type: "image/png",
        }),
      ],
    },
  });
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Máximo 4 MB"),
  );
  expect(
    fetcher.mock.calls.filter(([, o]) => o?.method === "POST"),
  ).toHaveLength(0);
});
