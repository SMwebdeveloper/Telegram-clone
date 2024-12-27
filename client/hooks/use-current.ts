import { IMessage, IUser } from "@/types";
import { create } from "zustand";

type Store = {
  currentContact: IUser | null;
  setCurrentContact: (contact: IUser | null) => void;
  editMessage: IMessage | null;
  setEditMessage: (message: IMessage | null) => void;
};
export const useCurrentContact = create<Store>()((set) => ({
  currentContact: null,
  setCurrentContact: (contact) => set({ currentContact: contact }),
  editMessage: null,
  setEditMessage: (message) => set({ editMessage: message }),
}));
