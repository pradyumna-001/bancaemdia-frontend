import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { AuthState, SessionService } from './session';

const Auth = createContext<
  Readonly<{ service: SessionService; state: AuthState }> | undefined
>(undefined);
export function ProvedorAuth({
  service,
  children,
}: {
  service: SessionService;
  children: ReactNode;
}) {
  const state = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );
  useEffect(() => {
    const resume = () => {
      const current = service.getSnapshot();
      if (
        current.person &&
        document.visibilityState !== 'hidden' &&
        !current.logoutUnconfirmed
      )
        void service.resume();
    };
    // The protected loader and login page bootstrap on demand. Public help pages
    // must not launch identity requests that can outlive a document navigation.
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [service]);
  return <Auth.Provider value={{ service, state }}>{children}</Auth.Provider>;
}
export function useAuth() {
  return useContext(Auth);
}
