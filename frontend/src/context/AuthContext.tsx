import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, ContractedGame } from '@/types';
import { gamesData } from '@/data/games';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  contractedGames: ContractedGame[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, organization: string, name: string) => Promise<boolean>;
  logout: () => void;
  contractGame: (gameId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [contractedGames, setContractedGames] = useState<ContractedGame[]>([]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email && password.length >= 6) {
      setUser({
        id: '1',
        email,
        organization: 'Playtek Demo',
        role: 'client',
        name: email.split('@')[0],
      });
      return true;
    }
    return false;
  }, []);

  const register = useCallback(async (
    email: string, 
    password: string, 
    organization: string,
    name: string
  ): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email && password.length >= 6 && organization && name) {
      setUser({
        id: '1',
        email,
        organization,
        role: 'client',
        name,
      });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setContractedGames([]);
  }, []);

  const contractGame = useCallback((gameId: string) => {
    const game = gamesData.find(g => g.id === gameId);
    if (game && !contractedGames.find(cg => cg.id === gameId)) {
      const contractedGame: ContractedGame = {
        ...game,
        contractedAt: new Date(),
        status: 'active',
        configUrl: `/games/${gameId}/config`,
        operationUrl: `/games/${gameId}/operate`,
      };
      setContractedGames(prev => [...prev, contractedGame]);
    }
  }, [contractedGames]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      contractedGames,
      login,
      register,
      logout,
      contractGame,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
