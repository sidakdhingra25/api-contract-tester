/**
 * Loads the contract config from the project by the exact filename.
 * Only looks for CONTRACT_VALIDATOR_CONFIG_FILENAME with extensions .js, .mjs, .cjs.
 * Node only (uses fs/path); in the browser the app should import the config and pass it.
 */

import type { ContractValidatorConfig } from "./types";
import { CONTRACT_VALIDATOR_CONFIG_FILENAME } from "./constants";

const EXTENSIONS = [".js", ".mjs", ".cjs"] as const;

/**
 * Resolves the config file path. Returns the first path that exists.
 */
function resolveConfigPath(cwd: string): string | null {
  try {
    const path = require("path");
    const fs = require("fs");
    for (const ext of EXTENSIONS) {
      const full = path.join(cwd, CONTRACT_VALIDATOR_CONFIG_FILENAME + ext);
      if (fs.existsSync(full)) return full;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Loads the contract validator config from the project.
 * Looks for a file named exactly CONTRACT_VALIDATOR_CONFIG_FILENAME (.js, .mjs, or .cjs) in cwd.
 * Only runs in Node (uses process.cwd, fs, path). In the browser, import the config and pass it.
 *
 * @param options.cwd - Project root (default: process.cwd()). The package checks only this directory.
 * @returns The config default export, or null if the file is not found or not in Node.
 */
export async function loadContractConfig(options?: {
  cwd?: string;
}): Promise<ContractValidatorConfig | null> {
  if (typeof process === "undefined" || !process.cwd) return null;

  const cwd = options?.cwd ?? process.cwd();
  const filePath = resolveConfigPath(cwd);
  if (!filePath) return null;

  try {
    const { pathToFileURL } = require("url");
    const url = pathToFileURL(filePath).href;
    const mod = await import(/* webpackIgnore: true */ url);
    const config = mod?.default;
    if (config && typeof config === "object" && Array.isArray(config.contracts)) {
      return config as ContractValidatorConfig;
    }
    return null;
  } catch {
    return null;
  }
}
