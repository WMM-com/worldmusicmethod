import { useRedirectHandler } from '@/hooks/useRedirections';

interface RedirectHandlerProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that checks for URL redirections before rendering children.
 * Place this around your Routes component in App.tsx.
 */
export function RedirectHandler({ children }: RedirectHandlerProps) {
  const { isLoading } = useRedirectHandler();

  // Optionally show a loading state while checking redirects
  // For better UX, we render children immediately but the redirect will happen if matched
  return <>{children}</>;
}
