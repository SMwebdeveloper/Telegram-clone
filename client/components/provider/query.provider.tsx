"use client";
import { ChildProps } from "@/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FC } from "react";
const qeurClient = new QueryClient();

const QueryProvider: FC<ChildProps> = ({ children }) => {
  return (
    <QueryClientProvider client={qeurClient}>{children}</QueryClientProvider>
  );
};

export default QueryProvider;
