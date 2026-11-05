import {
  PROFILE_EXPORT_SECTIONS,
  PROFILE_EXPORT_LABELS,
  PROFILE_EXPORT_COVERAGE,
  type ProfileExportSection,
} from "./export-sections";

type ExportPageInput = {
  section: ProfileExportSection;
  cursor?: string;
  limit?: number;
};
type FetchPage = (
  input: ExportPageInput,
) => Promise<{
  section: ProfileExportSection;
  items: unknown[];
  nextCursor: string | null;
}>;
export type ProfileExportProgress = {
  section: ProfileExportSection;
  label: string;
  completedSections: number;
  totalSections: number;
  records: number;
};

/** Fetch separately bounded responses; only the browser assembles the complete archive. */
export async function collectProfileExport(
  fetchPage: FetchPage,
  onProgress?: (progress: ProfileExportProgress) => void,
) {
  const sections = {} as Record<ProfileExportSection, unknown[]>;
  let records = 0;
  let completedSections = 0;
  for (const section of PROFILE_EXPORT_SECTIONS) {
    sections[section] = [];
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      onProgress?.({
        section,
        label: PROFILE_EXPORT_LABELS[section],
        completedSections,
        totalSections: PROFILE_EXPORT_SECTIONS.length,
        records,
      });
      const page = await fetchPage({ section, cursor, limit: 100 });
      if (page.section !== section)
        throw new Error("Unexpected export section");
      sections[section].push(...page.items);
      records += page.items.length;
      cursor = page.nextCursor ?? undefined;
      if (cursor && seen.has(cursor)) throw new Error("Repeated export cursor");
      if (cursor) seen.add(cursor);
    } while (cursor);
    completedSections++;
    onProgress?.({
      section,
      label: PROFILE_EXPORT_LABELS[section],
      completedSections,
      totalSections: PROFILE_EXPORT_SECTIONS.length,
      records,
    });
  }
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    coverage: PROFILE_EXPORT_COVERAGE,
    sections,
  };
}

export async function downloadProfileExport(
  fetchPage: FetchPage,
  onProgress?: (progress: ProfileExportProgress) => void,
) {
  const archive = await collectProfileExport(fetchPage, onProgress);
  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = `trading-journal-export-${archive.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Allow the browser to start reading the download before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
