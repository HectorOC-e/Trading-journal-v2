import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import React from "react";
import { TaxRuleUpdateEmail } from "@/emails/templates/tax-rule-update";
describe("public normative change email", () => {
  it("shows the year, before/after limits and official source without fiscal account data", async () => {
    const html = await render(
      React.createElement(TaxRuleUpdateEmail, {
        year: 2097,
        agreement: "SAR-01-2097",
        sourceUrl: "https://www.sar.gob.hn/download/acuerdo-sar-01-2097/",
        changes: [
          {
            label: "Mínimo exento",
            before: "228324.32",
            after: "240000.00",
            rate: "0",
          },
        ],
        appUrl: "https://www.tjournalx.com",
      }),
    );
    expect(html).toContain("2097");
    expect(html).toContain("228,324.32");
    expect(html).toContain("240,000.00");
    expect(html).toContain("https://www.sar.gob.hn/");
    expect(html).toContain("/fiscal");
    expect(html).not.toContain("RTN");
  });
});
