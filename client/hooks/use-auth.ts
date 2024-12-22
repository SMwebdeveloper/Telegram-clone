import { create } from "zustand";
import { IUser } from "@/types";

type Store = {
  step: "login" | "verify";
  setStep: (step: "login" | "verify") => void;
  email: string;
  setEmail: (email: string) => void;
  onlineUsers: IUser[];
  setOnlineUsers: (users: IUser[]) => void;
};

export const useAuth = create<Store>()((set) => ({
  step: "login",
  setStep: (step) => set({ step }),
  email: "",
  setEmail: (email) => set({ email }),
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
