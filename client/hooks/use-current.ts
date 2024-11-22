import { useState } from "react";
import { IUser } from "..";

const useCurrentContact = () => {
  const [currentContact, setCurrentContact] = useState<IUser | null>();

  return { currentContact, setCurrentContact };
};

export default useCurrentContact;
