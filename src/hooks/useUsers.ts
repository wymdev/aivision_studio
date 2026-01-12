"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { userService } from "@/services/user.service";

export function useUsers() {
  const { users, isLoading, error, setUsers, setLoading, setError } = useUserStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: any) => {
    try {
      setLoading(true);
      setError(null);
      await userService.createUser(userData);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    isLoading,
    error,
    loadUsers,
    createUser,
  };
}
