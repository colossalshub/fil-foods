import { createContext, useContext } from 'react';
import type { AuthTokenSession, AuthUser, PublicUser } from '../types';

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthTokenSession | null;
  keepLoggedIn: boolean;
  signIn: (nextUser: AuthUser | PublicUser | null | undefined, options?: {
    session?: AuthTokenSession | null;
    keepLoggedIn?: boolean;
  }) => void | Promise<void>;
  signOut: () => void | Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  keepLoggedIn: false,
  signIn: () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);
