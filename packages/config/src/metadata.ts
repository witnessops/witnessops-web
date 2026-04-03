import { getCanonicalSurfaceUrl, type SurfaceId } from "./surfaces";

export function getCanonicalAlternates(
  surfaceId: SurfaceId,
  pathname = "/",
) {
  return {
    canonical: getCanonicalSurfaceUrl(surfaceId, pathname),
  };
}
