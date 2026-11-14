// RFC 9728: a resource identifier with a path uses the path-appended
// well-known URI. The origin-level URI is a different resource.
export function protectedResourceMetadataPath(resourcePath) {
  const suffix = resourcePath && resourcePath !== '/' ? resourcePath : '';
  return `/.well-known/oauth-protected-resource${suffix}`;
}

export function isProtectedResourceMetadataRequest(pathname, resourcePath) {
  return pathname === protectedResourceMetadataPath(resourcePath);
}
