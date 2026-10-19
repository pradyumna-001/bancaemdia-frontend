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
    let leftWindow = false;
    const resume = () => {
      const current = service.getSnapshot();
      if (
        current.person &&
        document.visibilityState !== 'hidden' &&
        !current.logoutUnconfirmed
      )
        void service.resume();
    };
    const leaveWindow = () => {
      leftWindow = true;
    };
    const returnToWindow = () => {
      // A fresh document already bootstraps through its loader. Its first
      // activation must not hide the control receiving the initial click.
      if (!leftWindow) return;
      leftWindow = false;
      resume();
    };
    // The protected loader and login page bootstrap on demand. Public help pages
    // must not launch identity requests that can outlive a document navigation.
    window.addEventListener('blur', leaveWindow);
    window.addEventListener('focus', returnToWindow);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('blur', leaveWindow);
      window.removeEventListener('focus', returnToWindow);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [service]);
  return <Auth.Provider value={{ service, state }}>{children}</Auth.Provider>;
}
export function useAuth() {
  return useContext(Auth);
}
