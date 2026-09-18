export class ApiError extends Error {
  constructor(public status: number, message: string, public accessState?: import('./early-access').WorkspaceAccessState) { super(message); }
}
export function requireId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new ApiError(400, "A valid identifier is required.");
  return value;
}
