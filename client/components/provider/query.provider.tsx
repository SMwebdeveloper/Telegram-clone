"use client";
import { toast } from "@/hooks/use-toast";
import { ChildProps, IError } from "@/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FC } from "react";

const hadnleQueryError = (error: Error | IError) => {
  if ((error as IError).response?.data?.message) {
    return toast({
      description: (error as IError).response?.data?.message,
      variant: "destructive",
    });
  }
  return toast({
    description: "Something went wrong",
    variant: "destructive",
  });
};
const qeurClient = new QueryClient({
  defaultOptions: {
    mutations: { onError: hadnleQueryError },
  },
});

const QueryProvider: FC<ChildProps> = ({ children }) => {
  return (
    <QueryClientProvider client={qeurClient}>{children}</QueryClientProvider>
  );
};

export default QueryProvider;
