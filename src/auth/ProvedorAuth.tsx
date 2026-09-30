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
      if (
        document.visibilityState !== 'hidden' &&
        !service.getSnapshot().logoutUnconfirmed
      )
        void service.resume();
    };
    resume();
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
