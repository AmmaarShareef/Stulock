/** Browser-authenticated writes must originate from this application, not a cross-site form. */
export function hasTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
