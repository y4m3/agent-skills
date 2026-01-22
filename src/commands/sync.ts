import { Command } from "commander";
import {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  chmodSync,
} from "node:fs";
import { join, basename } from "node:path";
import {
  loadConfig,
  loadLockFile,
  saveLockFile,
  listAvailableComponents,
  getComponentPath,
  calculateDirectoryHash,
  expandPath,
  type LockFile,
  type ComponentInfo,
} from "../utils/config.js";

interface HookConfig {
  type: string;
  command: string;
}

interface HookEntry {
  matcher?: string;
  hooks: HookConfig[];
}

interface SettingsJson {
  hooks?: {
    PreToolUse?: HookEntry[];
    Notification?: HookEntry[];
    Stop?: HookEntry[];
  };
  [key: string]: unknown;
}

export const syncCommand = new Command("sync")
  .description("Sync components to configured destinations based on config.yaml")
  .option("--dry-run", "Show what would be done without making changes")
  .action((options) => {
    const config = loadConfig();
    const lock = loadLockFile();
    const availableComponents = listAvailableComponents();

    if (config.components.length === 0) {
      console.log("No components configured in config.yaml");
      return;
    }

    if (config.destinations.length === 0) {
      console.log("No destinations configured in config.yaml");
      return;
    }

    const newLock: LockFile = { components: {}, global_hash: "" };
    let hasChanges = false;

    // Get enabled components
    const enabledComponents = config.components
      .map((name) => availableComponents.find((c) => c.name === name))
      .filter((c): c is ComponentInfo => c !== undefined);

    const missingComponents = config.components.filter(
      (name) => !availableComponents.find((c) => c.name === name)
    );

    for (const name of missingComponents) {
      console.log(`\u26a0 Component "${name}" not found in components/ directory`);
    }

    // Process each destination
    for (const dest of config.destinations) {
      const expandedDest = expandPath(dest);
      console.log(`\n${dest}:`);

      // Ensure destination exists
      if (!options.dryRun) {
        mkdirSync(expandedDest, { recursive: true });
      }

      // Sync skills (SKILL.md files)
      const skillsDir = join(expandedDest, "skills");
      for (const component of enabledComponents) {
        if (!component.hasSkillMd) continue;

        const sourcePath = join(component.path, "SKILL.md");
        const destSkillDir = join(skillsDir, component.name);
        const destPath = join(destSkillDir, "SKILL.md");

        const sourceHash = calculateDirectoryHash(join(component.path));

        if (!existsSync(destPath)) {
          if (options.dryRun) {
            console.log(`  skills/${component.name}/: would copy`);
          } else {
            mkdirSync(destSkillDir, { recursive: true });
            cpSync(sourcePath, destPath);
            console.log(`  skills/${component.name}/: \u2713 copied`);
          }
          hasChanges = true;
        } else {
          const existingContent = readFileSync(destPath, "utf-8");
          const sourceContent = readFileSync(sourcePath, "utf-8");
          if (existingContent !== sourceContent) {
            if (options.dryRun) {
              console.log(`  skills/${component.name}/: would update`);
            } else {
              cpSync(sourcePath, destPath);
              console.log(`  skills/${component.name}/: \u2713 updated`);
            }
            hasChanges = true;
          } else {
            console.log(`  skills/${component.name}/: \u2713 synced`);
          }
        }
      }

      // Sync hooks
      const hooksDir = join(expandedDest, "hooks");
      const allHooks: string[] = [];

      for (const component of enabledComponents) {
        if (!component.hasHooks) continue;

        const sourceHooksDir = join(component.path, "hooks");
        const hookFiles = readdirSync(sourceHooksDir);

        for (const hookFile of hookFiles) {
          const sourcePath = join(sourceHooksDir, hookFile);
          const destPath = join(hooksDir, hookFile);
          allHooks.push(hookFile);

          if (!existsSync(destPath)) {
            if (options.dryRun) {
              console.log(`  hooks/${hookFile}: would copy`);
            } else {
              mkdirSync(hooksDir, { recursive: true });
              cpSync(sourcePath, destPath);
              chmodSync(destPath, 0o755);
              console.log(`  hooks/${hookFile}: \u2713 copied`);
            }
            hasChanges = true;
          } else {
            const existingContent = readFileSync(destPath, "utf-8");
            const sourceContent = readFileSync(sourcePath, "utf-8");
            if (existingContent !== sourceContent) {
              if (options.dryRun) {
                console.log(`  hooks/${hookFile}: would update`);
              } else {
                cpSync(sourcePath, destPath);
                chmodSync(destPath, 0o755);
                console.log(`  hooks/${hookFile}: \u2713 updated`);
              }
              hasChanges = true;
            } else {
              console.log(`  hooks/${hookFile}: \u2713 synced`);
            }
          }
        }
      }

      // Sync rules (skip .local.md files)
      const rulesDir = join(expandedDest, "rules");
      for (const component of enabledComponents) {
        if (!component.hasRules) continue;

        const sourceRulesDir = join(component.path, "rules");
        const ruleFiles = readdirSync(sourceRulesDir);

        for (const ruleFile of ruleFiles) {
          // Skip .local.md files
          if (ruleFile.endsWith(".local.md")) continue;

          const sourcePath = join(sourceRulesDir, ruleFile);
          const destPath = join(rulesDir, ruleFile);

          if (!existsSync(destPath)) {
            if (options.dryRun) {
              console.log(`  rules/${ruleFile}: would copy`);
            } else {
              mkdirSync(rulesDir, { recursive: true });
              cpSync(sourcePath, destPath);
              console.log(`  rules/${ruleFile}: \u2713 copied`);
            }
            hasChanges = true;
          } else {
            const existingContent = readFileSync(destPath, "utf-8");
            const sourceContent = readFileSync(sourcePath, "utf-8");
            if (existingContent !== sourceContent) {
              if (options.dryRun) {
                console.log(`  rules/${ruleFile}: would update`);
              } else {
                cpSync(sourcePath, destPath);
                console.log(`  rules/${ruleFile}: \u2713 updated`);
              }
              hasChanges = true;
            } else {
              console.log(`  rules/${ruleFile}: \u2713 synced`);
            }
          }
        }
      }

      // Generate CLAUDE.md from template
      const claudeMdPath = join(expandedDest, "CLAUDE.md");
      const claudeMdContent = generateClaudeMd(enabledComponents);

      if (!existsSync(claudeMdPath)) {
        if (options.dryRun) {
          console.log(`  CLAUDE.md: would create`);
        } else {
          writeFileSync(claudeMdPath, claudeMdContent, "utf-8");
          console.log(`  CLAUDE.md: \u2713 created`);
        }
        hasChanges = true;
      } else {
        const existingContent = readFileSync(claudeMdPath, "utf-8");
        if (existingContent !== claudeMdContent) {
          if (options.dryRun) {
            console.log(`  CLAUDE.md: would update`);
          } else {
            writeFileSync(claudeMdPath, claudeMdContent, "utf-8");
            console.log(`  CLAUDE.md: \u2713 updated`);
          }
          hasChanges = true;
        } else {
          console.log(`  CLAUDE.md: \u2713 synced`);
        }
      }

      // Update settings.json with hooks
      const settingsPath = join(expandedDest, "settings.json");
      const updatedSettings = updateSettingsWithHooks(settingsPath, allHooks);

      if (updatedSettings.changed) {
        if (options.dryRun) {
          console.log(`  settings.json: would update hooks`);
        } else {
          writeFileSync(
            settingsPath,
            JSON.stringify(updatedSettings.settings, null, 2),
            "utf-8"
          );
          console.log(`  settings.json: \u2713 hooks updated`);
        }
        hasChanges = true;
      } else {
        console.log(`  settings.json: \u2713 synced`);
      }
    }

    // Update lock file
    for (const component of enabledComponents) {
      newLock.components[component.name] = {
        source_hash: calculateDirectoryHash(component.path),
        destinations: {},
      };
      for (const dest of config.destinations) {
        newLock.components[component.name].destinations[dest] = {
          hash: calculateDirectoryHash(component.path),
          status: "synced",
          synced_at: new Date().toISOString(),
        };
      }
    }

    if (!options.dryRun) {
      saveLockFile(newLock);
    }

    console.log("");
    if (!hasChanges) {
      console.log("All components are up to date.");
    } else if (options.dryRun) {
      console.log("Run without --dry-run to apply changes.");
    }
  });

function generateClaudeMd(components: ComponentInfo[]): string {
  const lines = [
    "# Claude Code User-Level Instructions",
    "",
    "<!-- Auto-generated by agent-skills sync. Do not edit directly. -->",
    "<!-- For environment-specific settings, create CLAUDE.local.md -->",
    "",
  ];

  // Add rule references
  for (const component of components) {
    if (component.hasRules) {
      const rulesDir = join(component.path, "rules");
      const ruleFiles = readdirSync(rulesDir).filter(
        (f) => f.endsWith(".md") && !f.endsWith(".local.md")
      );
      for (const ruleFile of ruleFiles) {
        lines.push(`@rules/${ruleFile}`);
      }
    }
  }

  return lines.join("\n") + "\n";
}

function updateSettingsWithHooks(
  settingsPath: string,
  hookFiles: string[]
): { settings: SettingsJson; changed: boolean } {
  let settings: SettingsJson = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // Invalid JSON, start fresh
      settings = {};
    }
  }

  const originalJson = JSON.stringify(settings);

  // Build hooks configuration
  const hooks: SettingsJson["hooks"] = {
    PreToolUse: [],
    Notification: [],
    Stop: [],
  };

  // Map hook files to their events
  for (const hookFile of hookFiles) {
    const hookName = basename(hookFile, ".sh");
    const command = `bash $HOME/.claude/hooks/${hookFile}`;

    if (hookName === "block-main-commit") {
      hooks.PreToolUse!.push({
        matcher: "Bash",
        hooks: [{ type: "command", command }],
      });
    } else if (hookName === "notify-waiting") {
      hooks.Notification!.push({
        hooks: [{ type: "command", command }],
      });
    } else if (hookName === "notify-stop") {
      hooks.Stop!.push({
        hooks: [{ type: "command", command }],
      });
    }
  }

  // Merge hooks into settings
  settings.hooks = hooks;

  // Remove empty hook arrays
  if (settings.hooks.PreToolUse!.length === 0) delete settings.hooks.PreToolUse;
  if (settings.hooks.Notification!.length === 0)
    delete settings.hooks.Notification;
  if (settings.hooks.Stop!.length === 0) delete settings.hooks.Stop;

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  const newJson = JSON.stringify(settings);
  return { settings, changed: originalJson !== newJson };
}
