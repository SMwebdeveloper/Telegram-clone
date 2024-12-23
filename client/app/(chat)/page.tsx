"use client";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ContactLists from "./_components/contact-lists";
import { useCurrentContact } from "@/hooks/use-current";
import { useRouter, useSearchParams } from "next/navigation";
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
import { IUser } from "@/types/index";
import { toast } from "@/hooks/use-toast";
import { IError, IMessage } from "@/types";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import useAudio from "@/hooks/use-audio";
import { CONST } from "@/lib/constants";

const Page = () => {
  const [contacts, setContacts] = useState<IUser[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);

  const { setCreating, setLoading, isLoading, setLoadMessages } = useLoading();
  const { currentContact, setCurrentContact } = useCurrentContact();
  const { setOnlineUsers } = useAuth();
  const { playSound } = useAudio();

  const router = useRouter();
  const socket = useRef<ReturnType<typeof io> | null>(null);
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const CONTACT_ID = searchParams.get("chat");

  const contactForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { text: "", image: "" },
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

  const getMessages = async () => {
    setLoadMessages(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.get<{ messages: IMessage[] }>(
        `/api/user/messages/${currentContact?._id}`,
        { headers: { Authorization: `Baeror ${token}` } }
      );
      setMessages(data.messages);
    } catch (error) {
      toast({ description: "Cannot fetch messages", variant: "destructive" });
    } finally {
      setLoadMessages(false);
    }
  };
  useEffect(() => {
    router.replace("/");
    socket.current = io("ws://localhost:5000");
  }, []);

  useEffect(() => {
    if (session?.currentUser?._id) {
      getContacts();
      socket.current?.emit("addOnlineUser", session.currentUser);
      socket.current?.on(
        "getOnlineUsers",
        (data: { socketId: string; user: IUser }[]) => {
          setOnlineUsers(data.map((item) => item.user));
        }
      );
    }
  }, [session?.currentUser]);

  useEffect(() => {
    if (session?.currentUser) {
      socket.current?.on("getCreateUser", (user) => {
        setContacts((prev) => {
          const isExist = prev.some((item) => item._id === user._id);
          return isExist ? prev : [...prev, user];
        });
      });

      socket.current?.on(
        "getNewMessage",
        ({ newMessage, sender, receiver }: GetSocketType) => {
          setMessages((prev) => {
            const isExist = prev.some((item) => item._id === newMessage._id);
            return isExist ? prev : [...prev, newMessage];
          });
          setContacts((prev) =>
            prev.map((item) =>
              item._id === sender?._id
                ? { ...item, lastMessage: newMessage }
                : item
            )
          );
          toast({
            title: "New message",
            description: `${sender?.email.split("@")[0]} sent you a message`,
          });
          if (!receiver?.muted) {
            playSound(receiver?.notificationSound);
          }
        }
      );

      socket.current?.on("getReadMessages", (messages: IMessage[]) => {
        setMessages((prev) => {
          return prev.map((item) => {
            const message = messages.find((msg) => msg._id === item._id);
            return message ? { ...item, status: CONST.READ } : item;
          });
        });
      });
    }
  }, [session?.currentUser, socket]);

  useEffect(() => {
    if (currentContact?._id) {
      getMessages();
    }
  }, [currentContact]);

  const onCreateContact = async (values: z.infer<typeof emailSchema>) => {
    setCreating(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post("/api/user/contact", values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts((prev) => [...prev, data.contact]);
      socket.current?.emit("createContact", {
        currentUser: session?.currentUser,
        receiver: data.contact,
      });

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

  const onSendMessage = async (values: z.infer<typeof messageSchema>) => {
    setCreating(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<GetSocketType>(
        "/api/user/message",
        { ...values, receiver: currentContact?._id },
        { headers: { Authorization: `Baeror ${token}` } }
      );
      setMessages((prev) => [...prev, data.newMessage]);
      messageForm.reset();
      socket.current?.emit("sendMessages", {
        newMessage: data.newMessage,
        receiver: data.receiver,
        sender: data.sender,
      });
    } catch (error) {
      toast({ description: "Cannot sent message", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onReadMessages = async () => {
    const receivedMessages = messages
      .filter((message) => message.receiver._id === session?.currentUser?._id)
      .filter((message) => message.status !== CONST.READ);

    if (receivedMessages.length == 0) return;
    const token = await generateToken(session?.currentUser?._id);

    try {
      const { data } = await axiosClient.post<{ messages: IMessage[] }>(
        "/api/user/message-read",
        { messages: receivedMessages },
        { headers: { Authorization: `Baeror ${token}` } }
      );

      socket.current?.emit("readMessages", {
        receiver: currentContact,
        messages: data.messages,
      });
      setMessages((prev) => {
        return prev.map((item) => {
          const message = data.messages.find((msg) => msg._id === item._id);
          return message ? { ...item, status: CONST.READ } : item;
        });
      });
    } catch (error) {
      toast({ description: "Cannot read messages", variant: "destructive" });
    }
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
            <Chat
              messageForm={messageForm}
              onSendMessage={onSendMessage}
              messages={messages}
              onReadMessages={onReadMessages}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Page;
interface GetSocketType {
  receiver: IUser;
  sender: IUser;
  newMessage: IMessage;
}
