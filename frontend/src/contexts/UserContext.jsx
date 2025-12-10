import { createContext, useContext, useState, useEffect, useCallback } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrlAccess}/auth/acct-access`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Transform backend user data to match frontend format
        const userData = {
          id: data.user.id.toString(),
          name: `${data.user.firstName} ${data.user.lastName}`,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          avatar: null,
        };
        setUser(userData);
      } else {
        // Not authenticated, clear user
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [backendUrlAccess]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const value = {
    user,
    setUser,
    loading,
    refreshUser: fetchUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
