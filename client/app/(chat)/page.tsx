import { Loader2 } from "lucide-react";
import React from "react";
import ContactLists from "./_components/contact-lists";

const Page = () => {
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
    </>
  );
};

const contacts = [
  { email: "binasa@gmail.com", _id: 1 },
  { email: "haligi@gmail.com", _id: 2 },
  { email: "osha@gmail.com", _id: 3 },
  { email: "nimadir@gmail.com", _id: 4 },
];
export default Page;
