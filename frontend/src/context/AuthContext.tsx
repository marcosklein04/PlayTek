import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, ContractedGame } from "@/types";
import { fetchGames } from "@/api/games";
import { fetchMyContracts } from "@/api/contracts";
import { mapApiGameToGame } from "@/mappers/gameMapper";
import { apiLogin, apiRegister } from "@/api/auth";
import { fetchMyWallet } from "@/api/wallet";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  contractedGames: ContractedGame[];
  walletBalance: number | null;
  refreshContractedGames: () => Promise<void>;
  refreshWalletBalance: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, organization: string, name: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

function loadUserFromStorage(): User | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;
    return JSON.parse(rawUser) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());
  const [contractedGames, setContractedGames] = useState<ContractedGame[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const refreshWalletBalance = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setWalletBalance(null);
      return;
    }

    try {
      const wallet = await fetchMyWallet();
      setWalletBalance(Number(wallet.saldo ?? 0));
    } catch {
      setWalletBalance(null);
    }
  }, []);

  const refreshContractedGames = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setContractedGames([]);
      return;
    }

    try {
      // 1) Traigo contratos del usuario
      const { resultados: contracts } = await fetchMyContracts();

      // 2) Traigo catálogo completo para poder armar cards lindas
      const { resultados: catalog } = await fetchGames();

      // Map catalog por slug -> Game (modelo frontend)
      const catalogMap = new Map<string, any>();
      for (const g of catalog) {
        catalogMap.set(g.slug, mapApiGameToGame(g));
      }

      // 3) Quedarme con 1 contrato por juego (el más reciente)
      const latestBySlug = new Map<string, any>();
      for (const c of contracts) {
        const prev = latestBySlug.get(c.juego.slug);
        if (
          !prev ||
          new Date(c.creado_en || 0).getTime() > new Date(prev.creado_en || 0).getTime()
        ) {
          latestBySlug.set(c.juego.slug, c);
        }
      }

      // 4) Construir ContractedGame[] para la UI
      const contracted: ContractedGame[] = Array.from(latestBySlug.values()).map(
        (c: any) => {
          const base =
            catalogMap.get(c.juego.slug) || {
              id: c.juego.slug,
              name: c.juego.nombre,
              shortDescription: "",
              description: "",
              image: "",
              category: "general",
              pricing: {
                price: c.costo_cobrado ?? 0,
                type: "per-event",
                currency: "credits",
                period: "event",
              },
              modality: [],
              features: [],
              isPopular: false,
              isNew: false,
            };

          return {
            ...base,
            id: c.juego.slug,
            status: c.estado === "activo" ? "active" : "pending",
            contractedAt: new Date(c.creado_en || Date.now()),
          };
        }
      );

      setContractedGames(contracted);
    } catch (e) {
      // si falla, no rompemos UI
      setContractedGames([]);
    }
  }, []);

  const hydrateSessionData = useCallback(async () => {
    await Promise.all([refreshContractedGames(), refreshWalletBalance()]);
  }, [refreshContractedGames, refreshWalletBalance]);

  const register = useCallback(
    async (username: string, password: string, organization: string, name: string) => {
      try {
        const res = await apiRegister({
          username,
          password,
          name,
          organization,
        });

        localStorage.setItem(TOKEN_KEY, res.token);

        const u = res.user;
        const mappedUser: User = {
          id: String(u.id),
          email: u.email || "",
          organization: u.organization || organization || "",
          role: u.role || "client",
          name: u.name || u.username,
        };

        localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
        setUser(mappedUser);

        await hydrateSessionData();
        return true;
      } catch {
        return false;
      }
    },
    [hydrateSessionData]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const res = await apiLogin(username, password);

        // ✅ token
        localStorage.setItem(TOKEN_KEY, res.token);

        // ✅ user (según tu respuesta actual del backend: res.user)
        const u = res.user ?? res;
        const mappedUser: User = {
          id: String(u.id),
          email: u.email || "",
          organization: u.organization || "",
          role: u.role || "client",
          name: u.name || u.username || "",
        };

        localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
        setUser(mappedUser);

        // ✅ cargar "mis juegos" apenas loguea
        await hydrateSessionData();

        return true;
      } catch {
        return false;
      }
    },
    [hydrateSessionData]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setContractedGames([]);
    setWalletBalance(null);
  }, []);

  // ✅ si el usuario ya está en storage (refresh de página), cargamos juegos y saldo
  useEffect(() => {
    if (user) {
      void hydrateSessionData();
    }
  }, [user, hydrateSessionData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        contractedGames,
        walletBalance,
        refreshContractedGames,
        refreshWalletBalance,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
