import { useParams } from "react-router-dom";
import Profile from "./Profile";
import NotFound from "./NotFound";

export default function AtProfile() {
  const { handle, slug } = useParams<{ handle: string; slug?: string }>();

  // Only treat routes that start with @ as profile routes
  if (!handle?.startsWith("@")) {
    return <NotFound />;
  }

  const userId = handle.slice(1);
  return <Profile routeUserId={userId} routeSlug={slug} />;
}
