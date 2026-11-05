import { describe, expect, it, vi } from "vitest";
import { collectProfileExport } from "./download-profile-export";
import { PROFILE_EXPORT_SECTIONS } from "./export-sections";

describe("paginated profile export client", () => {
  it("walks every section/page and emits progress with coverage", async () => {
    const fetchPage = vi.fn(async ({ section, cursor }) => ({
      section,
      items: [{ id: cursor ?? section }],
      nextCursor: section === "trades" && !cursor ? "next" : null,
    }));
    const progress = vi.fn();
    const result = await collectProfileExport(fetchPage, progress);
    expect(fetchPage).toHaveBeenCalledTimes(PROFILE_EXPORT_SECTIONS.length + 1);
    expect(result.sections.trades).toHaveLength(2);
    expect(result.coverage.sections).toEqual(PROFILE_EXPORT_SECTIONS);
    expect(progress.mock.lastCall?.[0]).toMatchObject({
      completedSections: PROFILE_EXPORT_SECTIONS.length,
      totalSections: PROFILE_EXPORT_SECTIONS.length,
      records: PROFILE_EXPORT_SECTIONS.length + 1,
    });
  });
  it("aborts failed or repeated-cursor exports without returning partial success", async () => {
    await expect(
      collectProfileExport(async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
    await expect(
      collectProfileExport(async ({ section }) => ({
        section,
        items: [],
        nextCursor: "same",
      })),
    ).rejects.toThrow("cursor");
  });
});
