import { Command } from "commander";
import { listAvailableComponents, loadConfig } from "../utils/config.js";

export const listCommand = new Command("list")
  .description("List available components")
  .action(() => {
    const components = listAvailableComponents();
    const config = loadConfig();

    if (components.length === 0) {
      console.log("No components found in components/ directory");
      return;
    }

    console.log("Available components:\n");
    console.log("  Name           Skill  Hooks  Rules  Enabled");
    console.log("  ─────────────────────────────────────────────");

    for (const component of components) {
      const hasSkill = component.hasSkillMd ? "✓" : "-";
      const hasHooks = component.hasHooks ? "✓" : "-";
      const hasRules = component.hasRules ? "✓" : "-";
      const isEnabled = config.components.includes(component.name) ? "✓" : "-";

      console.log(
        `  ${component.name.padEnd(14)} ${hasSkill.padEnd(6)} ${hasHooks.padEnd(6)} ${hasRules.padEnd(6)} ${isEnabled}`
      );
    }

    console.log("");

    if (config.destinations.length > 0) {
      console.log("Configured destinations:");
      for (const dest of config.destinations) {
        console.log(`  - ${dest}`);
      }
      console.log("");
    }
  });
