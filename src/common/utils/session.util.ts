import type { Request } from 'express';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(toError(err)) : resolve()));
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(toError(err)) : resolve()));
  });
}
