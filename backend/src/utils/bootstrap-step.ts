type BootstrapLogger = {
  info: (message: string) => unknown;
  error: (message: string) => unknown;
};

/** Measure existing startup work without logging records, credentials or error payloads. */
export async function runBootstrapStep<T>(
  logger: BootstrapLogger,
  name: string,
  task: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  logger.info(`[bootstrap] step=${name} status=started`);
  try {
    const result = await task();
    logger.info(`[bootstrap] step=${name} status=ok durationMs=${Math.max(0, Date.now() - startedAt)}`);
    return result;
  } catch (error) {
    logger.error(`[bootstrap] step=${name} status=failed durationMs=${Math.max(0, Date.now() - startedAt)}`);
    // Required migrations, permissions and balance repairs must still block
    // readiness when unsuccessful; never turn a failed startup into success.
    throw error;
  }
}
