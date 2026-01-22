import {
  readFileSync,
  existsSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
export interface Config {
  components: string[];
  destinations: string[];
}

export interface DestinationStatus {
  hash: string;
  status: "synced" | "diverged" | "missing" | "deleted";
  synced_at: string;
  pending_action?: "update" | "delete";
}

export interface ComponentLockEntry {
  source_hash: string;
  destinations: {
    [path: string]: DestinationStatus;
  };
}

export interface LockFile {
  components: {
    [componentName: string]: ComponentLockEntry;
  };
  global_hash: string;
}

export interface ComponentInfo {
  name: string;
  path: string;
  hasSkillMd: boolean;
  hasHooks: boolean;
  hasRules: boolean;
  hasTemplates: boolean;
}

// Path utilities
export function getProjectRoot(): string {
  // Navigate from cli/src/utils to project root (3 levels up from dist)
  return resolve(__dirname, "..", "..", "..");
}

export function getComponentsDir(): string {
  return join(getProjectRoot(), "components");
}

export function getConfigPath(): string {
  return join(getProjectRoot(), "config.yaml");
}

export function getLockPath(): string {
  return join(getProjectRoot(), "config.lock.yaml");
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return resolve(path);
}

// Config file operations
export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { components: [], destinations: [] };
  }
  const content = readFileSync(configPath, "utf-8");
  const parsedRaw = parseYaml(content);
  const parsed =
    parsedRaw && typeof parsedRaw === "object" ? (parsedRaw as any) : {};

  const components = Array.isArray(parsed.components)
    ? parsed.components.filter((item: unknown) => typeof item === "string")
    : [];

  const destinations = Array.isArray(parsed.destinations)
    ? parsed.destinations.filter((item: unknown) => typeof item === "string")
    : [];

  return { components, destinations };
}

export function loadLockFile(): LockFile {
  const lockPath = getLockPath();
  if (!existsSync(lockPath)) {
    return { components: {}, global_hash: "" };
  }
  const content = readFileSync(lockPath, "utf-8");
  const parsed = parseYaml(content) || {};
  return {
    components: parsed.components || {},
    global_hash: parsed.global_hash || "",
  };
}

export function saveLockFile(lock: LockFile): void {
  const lockPath = getLockPath();
  writeFileSync(lockPath, stringifyYaml(lock), "utf-8");
}

// Component discovery
export function listAvailableComponents(): ComponentInfo[] {
  const componentsDir = getComponentsDir();
  if (!existsSync(componentsDir)) {
    return [];
  }

  const entries = readdirSync(componentsDir);
  const components: ComponentInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(componentsDir, entry);
    const stat = statSync(entryPath);
    if (stat.isDirectory()) {
      const skillMdPath = join(entryPath, "SKILL.md");
      const hooksPath = join(entryPath, "hooks");
      const rulesPath = join(entryPath, "rules");
      const templatesPath = join(entryPath, "templates");

      components.push({
        name: entry,
        path: entryPath,
        hasSkillMd: existsSync(skillMdPath),
        hasHooks: existsSync(hooksPath) && statSync(hooksPath).isDirectory(),
        hasRules: existsSync(rulesPath) && statSync(rulesPath).isDirectory(),
        hasTemplates:
          existsSync(templatesPath) && statSync(templatesPath).isDirectory(),
      });
    }
  }

  return components;
}

export function getComponentPath(componentName: string): string {
  return join(getComponentsDir(), componentName);
}

// Hash calculation
export function calculateDirectoryHash(dirPath: string): string {
  if (!existsSync(dirPath)) {
    return "";
  }

  const hash = createHash("sha256");
  const files = getAllFiles(dirPath).sort();

  for (const file of files) {
    const relativePath = file.replace(dirPath, "");
    const content = readFileSync(file);
    hash.update(relativePath);
    hash.update(content);
  }

  return hash.digest("hex").substring(0, 12);
}

export function calculateFileHash(filePath: string): string {
  if (!existsSync(filePath)) {
    return "";
  }
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex").substring(0, 12);
}

function getAllFiles(dirPath: string, files: string[] = []): string[] {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// Git detection
export function isGitManaged(path: string): boolean {
  let current = path;
  while (current !== dirname(current)) {
    if (existsSync(join(current, ".git"))) {
      return true;
    }
    current = dirname(current);
  }
  return false;
}

// Legacy compatibility - map to new structure
export function listAvailableSkills(): ComponentInfo[] {
  return listAvailableComponents().filter((c) => c.hasSkillMd);
}

export function getSkillSourcePath(skillName: string): string {
  return getComponentPath(skillName);
}
