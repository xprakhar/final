declare global {
  namespace Express {
    interface Register {
      body: unknown;
    }
  }
}
