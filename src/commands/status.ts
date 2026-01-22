import { Command } from "commander";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  loadConfig,
  loadLockFile,
  listAvailableComponents,
  expandPath,
} from "../utils/config.js";

export const statusCommand = new Command("status")
  .description("Show sync status of configured components")
  .action(() => {
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

    console.log("Component sync status:\n");

    for (const dest of config.destinations) {
      const expandedDest = expandPath(dest);
      console.log(`${dest}:`);

      if (!existsSync(expandedDest)) {
        console.log("  (not deployed)\n");
        continue;
      }

      // Check skills
      const skillsDir = join(expandedDest, "skills");
      for (const componentName of config.components) {
        const component = availableComponents.find(
          (c) => c.name === componentName
        );
        if (!component?.hasSkillMd) continue;

        const destSkillPath = join(skillsDir, componentName, "SKILL.md");
        const sourceSkillPath = join(component.path, "SKILL.md");

        if (!existsSync(destSkillPath)) {
          console.log(`  skills/${componentName}/: ○ not deployed`);
        } else {
          const destContent = readFileSync(destSkillPath, "utf-8");
          const sourceContent = readFileSync(sourceSkillPath, "utf-8");
          if (destContent === sourceContent) {
            console.log(`  skills/${componentName}/: ✓ synced`);
          } else {
            console.log(`  skills/${componentName}/: ⚠ out of sync`);
          }
        }
      }

      // Check hooks
      const hooksDir = join(expandedDest, "hooks");
      for (const componentName of config.components) {
        const component = availableComponents.find(
          (c) => c.name === componentName
        );
        if (!component?.hasHooks) continue;

        const sourceHooksDir = join(component.path, "hooks");
        const hookFiles = readdirSync(sourceHooksDir).filter((f) =>
          f.endsWith(".sh")
        );

        for (const hookFile of hookFiles) {
          const destHookPath = join(hooksDir, hookFile);
          const sourceHookPath = join(sourceHooksDir, hookFile);

          if (!existsSync(destHookPath)) {
            console.log(`  hooks/${hookFile}: ○ not deployed`);
          } else {
            const destContent = readFileSync(destHookPath, "utf-8");
            const sourceContent = readFileSync(sourceHookPath, "utf-8");
            if (destContent === sourceContent) {
              console.log(`  hooks/${hookFile}: ✓ synced`);
            } else {
              console.log(`  hooks/${hookFile}: ⚠ out of sync`);
            }
          }
        }
      }

      // Check rules
      const rulesDir = join(expandedDest, "rules");
      for (const componentName of config.components) {
        const component = availableComponents.find(
          (c) => c.name === componentName
        );
        if (!component?.hasRules) continue;

        const sourceRulesDir = join(component.path, "rules");
        const ruleFiles = readdirSync(sourceRulesDir).filter(
          (f) => f.endsWith(".md") && !f.endsWith(".local.md")
        );

        for (const ruleFile of ruleFiles) {
          const destRulePath = join(rulesDir, ruleFile);
          const sourceRulePath = join(sourceRulesDir, ruleFile);

          if (!existsSync(destRulePath)) {
            console.log(`  rules/${ruleFile}: ○ not deployed`);
          } else {
            const destContent = readFileSync(destRulePath, "utf-8");
            const sourceContent = readFileSync(sourceRulePath, "utf-8");
            if (destContent === sourceContent) {
              console.log(`  rules/${ruleFile}: ✓ synced`);
            } else {
              console.log(`  rules/${ruleFile}: ⚠ out of sync`);
            }
          }
        }
      }

      // Check CLAUDE.md
      const claudeMdPath = join(expandedDest, "CLAUDE.md");
      if (!existsSync(claudeMdPath)) {
        console.log(`  CLAUDE.md: ○ not deployed`);
      } else {
        console.log(`  CLAUDE.md: ✓ exists`);
      }

      // Check settings.json
      const settingsPath = join(expandedDest, "settings.json");
      if (!existsSync(settingsPath)) {
        console.log(`  settings.json: ○ not deployed`);
      } else {
        console.log(`  settings.json: ✓ exists`);
      }

      console.log("");
    }
  });
