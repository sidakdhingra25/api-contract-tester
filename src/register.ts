/**
 * One-shot registration: wire interceptor + validator from a contract config.
 * User creates contract-validator.config.ts, calls register(config), and imports that file once.
 */

import { ContractValidatorConfig } from "./config/types";
import { createInterceptor } from "./interceptor";
import { createContractValidator, CreateContractValidatorOptions } from "./validation";


/** Cleanup handle returned from register(); call to stop monitoring. */
export interface RegisterCleanup {
  /** Stops contract validation and restores original fetch. Idempotent. */
  unregister(): void;
}

let currentCleanup: (() => void) | null = null;

function isValidConfig(config: unknown): config is ContractValidatorConfig {
  return (
    config != null &&
    typeof config === "object" &&
    Array.isArray((config as ContractValidatorConfig).contracts)
  );
}

/**
 * Registers the contract monitor: patches fetch, validates requests/responses against config.
 * Call once when your app loads (e.g. from contract-validator.config.ts).
 * If called again without unregister(), the previous registration is replaced (cleanup runs first).
 *
 * @param config - Result of defineContractConfig(...). Must have a non-empty contracts array.
 * @param options - Optional: onViolation callback for custom handling of contract violations.
 * @returns Cleanup handle; call .unregister() to stop monitoring (e.g. on app teardown).
 * @example
 * // In contract-validator.config.ts:
 * const config = defineContractConfig((builder) => { ... });
 * register(config);
 * export default config;
 */
export function register(
  config: ContractValidatorConfig,
  options?: CreateContractValidatorOptions
): RegisterCleanup {
  if (!isValidConfig(config)) {
    throw new TypeError(
      "[api-contract-tester] register(config): config must be an object with a 'contracts' array (e.g. from defineContractConfig)."
    );
  }
  if (config.contracts.length === 0) {
    throw new TypeError(
      "[api-contract-tester] register(config): config.contracts must not be empty."
    );
  }

  // Replace any existing registration
  if (currentCleanup !== null) {
    currentCleanup();
    currentCleanup = null;
  }

  const interceptor = createInterceptor();
  interceptor.install();
  const validator = createContractValidator(config, options);
  validator.attach(interceptor);

  const cleanup = (): void => {
    if (currentCleanup === null) return;
    validator.detach();
    interceptor.uninstall();
    currentCleanup = null;
  };
  currentCleanup = cleanup;

  return {
    unregister: cleanup,
  };
}

/**
 * Stops the current contract monitor (if any). Safe to call multiple times.
 * Use this in framework cleanup (e.g. React useEffect return) when you cannot hold the
 * return value of register().
 */
export function unregister(): void {
  if (currentCleanup !== null) {
    currentCleanup();
    currentCleanup = null;
  }
}
