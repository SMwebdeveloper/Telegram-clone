"use client";

import { Loader2 } from "lucide-react";
import ContactList from "./_components/contact-lists";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AddContact from "./_components/add-contact";
import { useCurrentContact } from "@/hooks/use-current";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emailSchema, messageSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import TopChat from "./_components/top-chat";
import Chat from "./_components/chat";
import { useLoading } from "@/hooks/use-loading";
import { axiosClient } from "@/http/axios";
import { useSession } from "next-auth/react";
import { generateToken } from "@/lib/generate-token";
import { IError, IMessage, IUser } from "@/types";
import { toast } from "@/hooks/use-toast";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import useAudio from "@/hooks/use-audio";
import { CONST } from "@/lib/constants";

const HomePage = () => {
  const [contacts, setContacts] = useState<IUser[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);

  const { setCreating, setLoading, isLoading, setLoadMessages, setTyping } =
    useLoading();
  const { currentContact, editMessage, setEditMessage } = useCurrentContact();
  const { data: session } = useSession();
  const { setOnlineUsers } = useAuth();
  const { playSound } = useAudio();

  const router = useRouter();
  const socket = useRef<ReturnType<typeof io> | null>(null);

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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setContacts(data.contacts);
    } catch {
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(data.messages);
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage: item.lastMessage
                  ? { ...item.lastMessage, status: CONST.READ }
                  : null,
              }
            : item
        )
      );
    } catch {
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
      socket.current?.emit("addOnlineUser", session.currentUser);
      socket.current?.on(
        "getOnlineUsers",
        (data: { socketId: string; user: IUser }[]) => {
          setOnlineUsers(data.map((item) => item.user));
        }
      );
      getContacts();
    }
  }, [session?.currentUser]);

  useEffect(() => {
    if (session?.currentUser) {
      socket.current?.on("getCreatedUser", (user) => {
        setContacts((prev) => {
          const isExist = prev.some((item) => item._id === user._id);
          return isExist ? prev : [...prev, user];
        });
      });

      socket.current?.on(
        "getNewMessage",
        ({ newMessage, sender, receiver }: GetSocketType) => {
          setTyping({ message: "", sender: null });
          if (currentContact?._id === newMessage?.sender._id) {
            setMessages((prev) => [...prev, newMessage]);
          }
          setContacts((prev: any) => {
            return prev.map((contact: IUser) => {
              if (contact._id === sender._id) {
                return {
                  ...contact,
                  lastMessage: {
                    ...newMessage,
                    status:
                      currentContact?._id === sender._id
                        ? CONST.READ
                        : newMessage?.status,
                  },
                };
              }
              return contact;
            });
          });
          toast({
            title: "New message",
            description: `${sender?.email.split("@")[0]} sent you a message`,
          });
          if (!receiver.muted) {
            playSound(receiver.notificationSound);
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

      socket.current?.on(
        "getUpdateMessage",
        ({ updatedMessage, sender, receiver }: GetSocketType) => {
          setTyping({ message: "", sender: null });
          setMessages((prev: any) =>
            prev.map((item: any) =>
              item._id === updatedMessage?._id
                ? {
                    ...item,
                    reaction: updatedMessage?.reaction,
                    text: updatedMessage?.text,
                  }
                : item
            )
          );
          setContacts((prev: any) =>
            prev.map((item: any) =>
              item._id === sender._id
                ? {
                    ...item,
                    lastMessage:
                      item.lastMessage?._id === updatedMessage?._id
                        ? updatedMessage
                        : item.lastMessage,
                  }
                : item
            )
          );
        }
      );

      socket.current?.on(
        "getDeleteMessage",
        ({ deletedMessage, sender, filteredMessages }: GetSocketType) => {
          setMessages((prev) =>
            prev.filter((item) => item._id !== deletedMessage?._id)
          );
          const lastMessage = filteredMessages?.length
            ? filteredMessages?.[filteredMessages?.length - 1]
            : null;
          setContacts((prev) =>
            prev.map((item) =>
              item._id === sender?._id
                ? {
                    ...item,
                    lastMessage:
                      item.lastMessage?._id === deletedMessage?._id
                        ? lastMessage
                        : item.lastMessage,
                  }
                : item
            )
          );
        }
      );
      socket.current?.on("getTyping", ({ message, sender }: GetSocketType) => {
        if (currentContact?._id === sender._id) {
          setTyping({ sender, message });
        }
      });
    }
  }, [session?.currentUser, socket, currentContact?._id]);

  useEffect(() => {
    if (currentContact?._id) {
      getMessages();
    }
  }, [currentContact]);

  const onSubmitMessage = async (values: z.infer<typeof messageSchema>) => {
    setCreating(true);
    if (editMessage?._id) {
      onEditMessage(editMessage._id, values.text);
    } else {
      onSendMessage(values);
    }
  };
  const onCreateContact = async (values: z.infer<typeof emailSchema>) => {
    setCreating(true);
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<{ contact: IUser }>(
        "/api/user/contact",
        values,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setContacts((prev) => [...prev, data.contact]);
      socket.current?.emit("createContact", {
        currentUser: session?.currentUser,
        receiver: data.contact,
      });
      toast({ description: "Contact added successfully" });
      contactForm.reset();
    } catch (error: any) {
      if ((error as IError).response?.data?.message) {
        return toast({
          description: (error as IError).response.data.message,
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev: any) => [...prev, data.newMessage]);
      setContacts((prev: any) =>
        prev.map((item: IUser) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage: { ...data.newMessage, status: CONST.READ },
              }
            : item
        )
      );
      messageForm.reset();
      socket.current?.emit("sendMessage", {
        newMessage: data.newMessage,
        receiver: data.receiver,
        sender: data.sender,
      });
      if (!data.sender.muted) {
        playSound(data.sender.sendingSound);
      }
    } catch {
      toast({ description: "Cannot send message", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onReadMessages = async () => {
    const receivedMessages = messages
      .filter((message) => message.receiver._id === session?.currentUser?._id)
      .filter((message) => message.status !== CONST.READ);

    if (receivedMessages.length === 0) return;
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<{ messages: IMessage[] }>(
        "/api/user/message-read",
        { messages: receivedMessages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket.current?.emit("readMessages", {
        messages: data.messages,
        receiver: currentContact,
      });
      setMessages((prev) => {
        return prev.map((item) => {
          const message = data.messages.find((msg) => msg._id === item._id);
          return message ? { ...item, status: CONST.READ } : item;
        });
      });
    } catch {
      toast({ description: "Cannot read messages", variant: "destructive" });
    }
  };
  const onEditMessage = async (messageId: string, text: string) => {
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.put<{ updatedMessage: IMessage }>(
        `/api/user/message/${messageId}`,
        { text },
        { headers: { Authorization: `Baeror ${token}` } }
      );
      setMessages((prev) =>
        prev.map((item) =>
          item._id === data?.updatedMessage?._id
            ? { ...item, text: data.updatedMessage.text }
            : item
        )
      );
      socket.current?.emit("updatedMessage", {
        updatedMessage: data?.updatedMessage,
        receiver: currentContact,
        sender: session?.currentUser,
      });
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage:
                  item.lastMessage?._id === messageId
                    ? data.updatedMessage
                    : item.lastMessage,
              }
            : item
        )
      );
      setEditMessage(null);
      messageForm.reset();
    } catch (error) {
      toast({ description: "Cannot edit message", variant: "destructive" });
    }
  };
  const onReaction = async (reaction: string, messageId: string) => {
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.post<{ updatedMessage: IMessage }>(
        "/api/user/reaction",
        { reaction, messageId },
        { headers: { Authorization: `Baeror ${token}` } }
      );
      setMessages((prev) =>
        prev.map((item) =>
          item._id === data?.updatedMessage?._id
            ? { ...item, reaction: data?.updatedMessage?.reaction }
            : item
        )
      );
      socket.current?.emit("updatedMessage", {
        updatedMessage: data?.updatedMessage,
        receiver: currentContact,
        sender: session?.currentUser,
      });
    } catch (error) {
      toast({ description: "Cannot read to message", variant: "destructive" });
    }
  };

  const onDeletedMessage = async (messageId: string) => {
    const token = await generateToken(session?.currentUser?._id);
    try {
      const { data } = await axiosClient.delete(
        `/api/user/message/${messageId}`,
        { headers: { Authorization: `Baeror ${token}` } }
      );
      const filteredMessages = messages.filter(
        (item) => item._id !== data?._id
      );
      setMessages(filteredMessages);
      socket.current?.emit("deleteMessage", {
        deletedMessage: data,
        sender: session?.currentUser,
        receiver: currentContact,
        filteredMessages,
      });
      setContacts((prev) =>
        prev.map((item) =>
          item._id === currentContact?._id
            ? {
                ...item,
                lastMessage:
                  item.lastMessage?._id === messageId
                    ? filteredMessages.length
                      ? filteredMessages[filteredMessages.length - 1]
                      : null
                    : item.lastMessage,
              }
            : item
        )
      );
    } catch (error) {
      toast({ description: "Cannot delete message", variant: "destructive" });
    }
  };
  const onTyping = (e: ChangeEvent<HTMLInputElement>) => {
    socket.current?.emit("typing", {
      receiver: currentContact,
      sender: session?.currentUser,
      message: e.target.value,
    });
  };

  return (
    <>
      <div className="w-80 max-md:w-16 h-screen border-r fixed inset-0 z-50">
        {isLoading && (
          <div className="w-full h-[95vh] flex justify-center items-center">
            <Loader2 size={50} className="animate-spin" />
          </div>
        )}

        {!isLoading && <ContactList contacts={contacts} />}
      </div>
      <div className="max-md:pl-16 pl-80 w-full">
        {!currentContact?._id && (
          <AddContact
            contactForm={contactForm}
            onCreateContact={onCreateContact}
          />
        )}

        {currentContact?._id && (
          <div className="w-full relative">
            <TopChat messages={messages} />
            <Chat
              messageForm={messageForm}
              onSubmitMessage={onSubmitMessage}
              messages={messages}
              onReadMessages={onReadMessages}
              onReaction={onReaction}
              onDeletedMessage={onDeletedMessage}
              onTyping={onTyping}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default HomePage;

interface GetSocketType {
  receiver: IUser;
  sender: IUser;
  newMessage: IMessage;
  updatedMessage: IMessage;
  deletedMessage: IMessage;
  filteredMessages: IMessage[];
  message: string;
}
