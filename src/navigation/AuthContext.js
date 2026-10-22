import { createContext, useContext } from 'react';

export const AuthContext = createContext({ user: null, signIn: () => {}, signOut: () => {} });
export const useAuth = () => useContext(AuthContext);
