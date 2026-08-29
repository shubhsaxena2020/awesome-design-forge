/**
 * Publish / packaging readiness checks.
 *
 * Roadmap item #9: "version stamping, license metadata, and output bundle
 * validation" so the build can be packaged without manual patching, and the
 * readiness check FAILS if metadata is missing.
 *
 * This is a pure, offline check — it reads package.json / LICENSE from a
 * directory and validates the expected fields. It does NOT publish; it reports.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ReadinessFinding {
  ok: boolean;
  key: string;
  message: string;
}

const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export interface ReadinessOptions {
  /** Require a LICENSE file or a `license` field. */
  requireLicense?: boolean;
  /** Require a `repository` field (URL or {url}). */
  requireRepository?: boolean;
  /** Require these extra package.json fields to be non-empty. */
  requireFields?: string[];
}

export function checkPublishReadiness(
  pkgDir: string,
  opts: ReadinessOptions = {},
): ReadinessFinding[] {
  const findings: ReadinessFinding[] = [];
  const pkgPath = path.join(pkgDir, "package.json");
  const add = (ok: boolean, key: string, message: string) => findings.push({ ok, key, message });

  if (!fs.existsSync(pkgPath)) {
    add(false, "package.json", `missing at ${pkgPath}`);
    return findings;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch (e) {
    add(false, "package.json", `invalid JSON: ${(e as Error).message}`);
    return findings;
  }

  // name
  if (typeof pkg.name === "string" && pkg.name.trim()) add(true, "name", pkg.name);
  else add(false, "name", "missing or empty");

  // version + semver
  if (typeof pkg.version === "string" && SEMVER_RE.test(pkg.version)) add(true, "version", pkg.version);
  else add(false, "version", `missing or not semver: ${String(pkg.version)}`);

  // license (field OR file)
  const hasLicenseField = typeof pkg.license === "string" && pkg.license.trim().length > 0;
  const hasLicenseFile = fs.existsSync(path.join(pkgDir, "LICENSE")) || fs.existsSync(path.join(pkgDir, "LICENSE.md"));
  if (!opts.requireLicense || hasLicenseField || hasLicenseFile) {
    add(hasLicenseField || hasLicenseFile, "license", hasLicenseField ? `field: ${pkg.license}` : hasLicenseFile ? "LICENSE file present" : "no license field/file");
  } else {
    add(false, "license", "required but missing (add `license` field or LICENSE file)");
  }

  // repository
  const repo = pkg.repository;
  const repoOk = typeof repo === "string" ? repo.trim().length > 0 : !!(repo && typeof repo === "object" && (repo as Record<string, unknown>).url);
  if (!opts.requireRepository || repoOk) add(repoOk, "repository", repoOk ? "present" : "missing (optional)");
  else add(false, "repository", "required but missing");

  // extra required fields
  for (const f of opts.requireFields ?? []) {
    const v = pkg[f];
    if (v != null && String(v).trim() !== "") add(true, f, String(v));
    else add(false, f, `required field '${f}' missing`);
  }

  // output bundle sanity: a buildable scaffold declares a build/dev script
  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  const runnableKey = Object.keys(scripts).find(
    (k) => k === "build" || k === "dev" || k.startsWith("build:") || k.startsWith("dev:"),
  );
  const runnableVal = runnableKey ? scripts[runnableKey] : undefined;
  if (runnableKey && runnableVal && runnableVal.trim().length > 0) {
    add(true, "scripts", `${runnableKey}: ${runnableVal}`);
  } else {
    add(false, "scripts", "no build/dev script — output bundle not runnable");
  }

  return findings;
}

export interface ReadinessReport {
  ok: boolean;
  findings: ReadinessFinding[];
}

export function formatReadiness(report: ReadinessReport): string {
  const lines = report.findings.map((f) => `  ${f.ok ? "✓" : "✗"} ${f.key}: ${f.message}`);
  return `${report.ok ? "✓ ready to publish" : "✗ not ready to publish"}\n${lines.join("\n")}`;
}
