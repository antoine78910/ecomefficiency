import { permanentRedirect } from "next/navigation";

// Catch-all for unexpected nested blog paths (e.g. /blog/foo/bar).
// Keeps Google from reporting these as 404 and consolidates signals on the canonical /blog.
export default function BlogCatchAll() {
  permanentRedirect("/blog");
}

