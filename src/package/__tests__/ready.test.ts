import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { checkPublishReadiness, formatReadiness } from "../../package/ready.ts";

function writePkg(dir: string, pkg: unknown, extra: Record<string, string> = {}) {
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2));
  for (const [k, v] of Object.entries(extra)) fs.writeFileSync(path.join(dir, k), v);
}

describe("ready: item #9 publish readiness", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "df-ready-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("passes a fully-populated, semver-stamped package", () => {
    writePkg(
      dir,
      { name: "x", version: "1.2.3", license: "MIT", repository: { url: "https://e/x" }, scripts: { build: "vite build" } },
      { LICENSE: "MIT" },
    );
    const f = checkPublishReadiness(dir, { requireLicense: true, requireRepository: true });
    expect(f.every((x) => x.ok)).toBe(true);
  });

  it("fails fast when version is missing or not semver", () => {
    writePkg(dir, { name: "x", version: "next", scripts: { build: "vite build" } });
    const f = checkPublishReadiness(dir);
    const v = f.find((x) => x.key === "version");
    expect(v?.ok).toBe(false);
  });

  it("fails when license is required but absent (field + file)", () => {
    writePkg(dir, { name: "x", version: "1.0.0", scripts: { build: "b" } });
    const f = checkPublishReadiness(dir, { requireLicense: true });
    const lic = f.find((x) => x.key === "license");
    expect(lic?.ok).toBe(false);
  });

  it("passes license via LICENSE file even without a license field", () => {
    writePkg(dir, { name: "x", version: "1.0.0", scripts: { build: "b" } }, { LICENSE: "MIT" });
    const f = checkPublishReadiness(dir, { requireLicense: true });
    const lic = f.find((x) => x.key === "license");
    expect(lic?.ok).toBe(true);
  });

  it("fails when the output bundle has no build/dev script", () => {
    writePkg(dir, { name: "x", version: "1.0.0" });
    const f = checkPublishReadiness(dir);
    const s = f.find((x) => x.key === "scripts");
    expect(s?.ok).toBe(false);
  });

  it("report is human-readable", () => {
    writePkg(dir, { name: "x", version: "1.0.0", scripts: { build: "b" } });
    const out = formatReadiness({ ok: false, findings: checkPublishReadiness(dir) });
    expect(out).toContain("not ready to publish");
  });
});
