"use client";
import { Loader2 } from "lucide-react";
import React, { useEffect } from "react";
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

const Page = () => {
  const { currentContact, setCurrentContact } = useCurrentContact();
  const router = useRouter();

  const contactForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "", image: "" },
  });
  useEffect(() => {
    router.replace("/");
  }, []);

  const onCreateContact = (values: z.infer<typeof emailSchema>) => {
    console.log(values);
  };

  const onSendMessage = (values: z.infer<typeof messageSchema>) => {
    console.log(values);
  };
  return (
    <>
      {/* Sidebar */}
      <div className="w-80 h-screen border-r fixed inset-0 z-50 ">
        {/* Loader */}
        {/* <div className="w-full h-[95vh] flex justify-center items-center">
          <Loader2 size={50} className="animate-spin" />
        </div> */}

        {/* Contact lists */}
        <ContactLists contacts={contacts} />
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

const contacts = [
  { email: "binasa@gmail.com", _id: 1, avatar: "" },
  { email: "haligi@gmail.com", _id: 2, avatar: "" },
  { email: "osha@gmail.com", _id: 3, avatar: "" },
  { email: "nimadir@gmail.com", _id: 4, avatar: "" },
];
const messages = [
  { text: "Hello", _id: 1 },
  { text: "nimadir", _id: 2 },
  { text: "osha", _id: 3 },
  { text: "nimadir", _id: 4 },
];
export default Page;
