import { create } from "zustand";
import { User } from "@/types/user.types";

interface UserState {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, userData: Partial<User>) => void;
  deleteUser: (id: string) => void;
  selectUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  error: null,

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => ({
      users: [...state.users, user],
    })),

  updateUser: (id, userData) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === id ? { ...user, ...userData } : user
      ),
      selectedUser:
        state.selectedUser?.id === id
          ? { ...state.selectedUser, ...userData }
          : state.selectedUser,
    })),

  deleteUser: (id) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== id),
      selectedUser: state.selectedUser?.id === id ? null : state.selectedUser,
    })),

  selectUser: (user) => set({ selectedUser: user }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
