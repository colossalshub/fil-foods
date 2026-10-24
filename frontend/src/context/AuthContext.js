import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  user: null,
  keepLoggedIn: false,
  signIn: () => {},
  signOut: () => {},
});
export const useAuth = () => useContext(AuthContext);
