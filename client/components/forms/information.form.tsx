import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { profileSchema } from "@/lib/validation";
import { useMutation } from "@tanstack/react-query";
import { axiosClient } from "@/http/axios";
import { IError, IUser } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { generateToken } from "@/lib/generate-token";

const InformationForm = () => {
  const { data: session, update } = useSession();
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: session?.currentUser?.firstName,
      lastName: session?.currentUser?.lastName,
      bio: session?.currentUser?.bio,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: z.infer<typeof profileSchema>) => {
      const token = await generateToken(session?.currentUser?._id);
      const { data } = await axiosClient.put<{ user: IUser }>(
        "/api/user/profile",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
      console.log(token);
    },
    onSuccess: () => {
      // signIn("credentials", { email: user.email, callbackUrl: "/" });
      toast({ description: "Successfully verified" });
      update();
    },
    onError: (error: IError) => {
      if (error.response?.data?.message) {
        return toast({
          description: error.response.data.message,
          variant: "destructive",
        });
      }
      return toast({
        description: "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    // Handle form submission
    // console.log(data);
    mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <Label>First name</Label>
              <FormControl>
                <Input
                  placeholder="Oman"
                  className="bg-secondary"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs text-red-500" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <Label>Last name</Label>
              <FormControl>
                <Input
                  placeholder="Ali"
                  className="bg-secondary"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter anyhting about yourself"
                  disabled={isPending}
                  className="bg-secondary"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          Submit
        </Button>
      </form>
    </Form>
  );
};

export default InformationForm;
