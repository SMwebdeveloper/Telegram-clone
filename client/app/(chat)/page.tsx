"use client";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import ContactLists from "./_components/contact-lists";
import { useCurrentContact } from "@/hooks/use-current";
import { useRouter } from "next/navigation";
import AddContact from "./_components/add-contact";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emailSchema, messageSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import TopChat from "./_components/top-chat";
import Chat from "./_components/chat";
import { useLoading } from "@/hooks/use-loading";
import { useSession } from "next-auth/react";
import { generateToken } from "@/lib/generate-token";
import { axiosClient } from "@/http/axios";
import { IUser } from "@/index";
import { toast } from "@/hooks/use-toast";
import { IError } from "@/types";

const Page = () => {
  const [contacts, setContacts] = useState<IUser[]>([]);
  const { setCreating, setLoading, isLoading } = useLoading();
  const { currentContact, setCurrentContact } = useCurrentContact();
  const router = useRouter();
  const { data: session } = useSession();

  const contactForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "", image: "" },
  });

  const getContacts = async () => {
    setLoading(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.get<{ contacts: IUser[] }>(
        "/api/user/contacts",
        { headers: { Authorization: `Baeror ${token}` } }
      );
      setContacts(data?.contacts);
    } catch (error) {
      toast({ description: "Cannot fetch contacts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    router.replace("/");
  }, []);

  useEffect(() => {
    if (session?.currentUser?._id) {
      getContacts();
    }
  }, [session?.currentUser]);
  const onCreateContact = async (values: z.infer<typeof emailSchema>) => {
    setCreating(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post("/api/user/contact", values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts((prev) => [...prev, data.contact]);
      toast({ description: "Contact added successfully" });
    } catch (error: any) {
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
    } finally {
      setCreating(false);
    }
  };

  const onSendMessage = (values: z.infer<typeof messageSchema>) => {
    console.log(values);
  };
  return (
    <>
      {/* Sidebar */}
      <div className="w-80 h-screen border-r fixed inset-0 z-50 ">
        {/* Loader */}
        {isLoading && (
          <div className="w-full h-[95vh] flex justify-center items-center">
            <Loader2 size={50} className="animate-spin" />
          </div>
        )}
        {/* Contact lists */}
        {!isLoading && <ContactLists contacts={contacts} />}{" "}
      </div>

      {/* Chat area */}
      <div className="pl-80 w-full">
        {!currentContact?._id && (
          <AddContact
            contactForm={contactForm}
            onCreateContact={onCreateContact}
          />
        )}
        {currentContact?._id && (
          <div className="w-full relative">
            <TopChat />
            {/* Chat */}
            <Chat messageForm={messageForm} onSendMessage={onSendMessage} />
          </div>
        )}
      </div>
    </>
  );
};

export default Page;
