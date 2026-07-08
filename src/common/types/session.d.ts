import 'express-session';

declare module 'express-session' {
  interface SessionData {
    auth?: {
      id: string;
      role: 'AGENCY' | 'ADMIN' | 'INVESTOR';
    };
  }
}
