"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useCallback } from "react";

export function useAuth() {
  const { user, isAuthenticated, token, login, logout } = useAuthStore();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      // Implement your login logic here
      // This is a mock implementation
      const mockUser = {
        id: "1",
        name: "John Doe",
        email,
      };
      const mockToken = "mock-jwt-token";

      login(mockUser, mockToken);
    },
    [login]
  );

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return {
    user,
    isAuthenticated,
    token,
    login: handleLogin,
    logout: handleLogout,
  };
}
