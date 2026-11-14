/**
 * Wraps `run` so that at most one run is in progress and at most one more is
 * queued. Calls made while a run is in progress share the queued run, so a
 * burst of model changes costs two runs rather than one per change.
 *
 * @template T
 * @param {() => Promise<T>} run
 * @returns {() => Promise<T>}
 */
export function coalesce(run) {
  let current;
  let queued;

  const start = () => {
    current = run().finally(() => {
      current = undefined;
    });
    return current;
  };

  return () => {
    if (!current) return start();
    queued ??= current
      .catch(() => undefined)
      .then(() => {
        queued = undefined;
        return start();
      });
    return queued;
  };
}
