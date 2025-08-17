import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const JoinClass = () => {
  const router = useRouter();
  // tRPC hook for state invalidation and other things
  const apiUtils = api.useUtils();

  const { mutateAsync: joinClass, isLoading } = api.class.join.useMutation({
    onSuccess: async (output) => {
      toast.success(`Joined class with code: ${output.classCode}`);
      await apiUtils.enrollment.getAllCurrentUser.invalidate();
      void router.push(`/`);
    },
    onError: () => {
      toast.error(`Could not join class. Do you have a valid class code?`);
    },
  });

  // input field for class code
  const [input, setInput] = useState("");

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Join Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">Join an existing class with a class code from your teacher</p>
            <div className="space-y-2">
              <Label htmlFor="classCode">Class Code</Label>
              <Input
                id="classCode"
                placeholder="Enter class code"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    try {
                      void joinClass({ classCode: input });
                      setInput("");
                    } catch (e) {}
                  }
                }}
              />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                disabled={isLoading}
                onClick={() => {
                  try {
                    void joinClass({ classCode: input });
                    setInput("");
                  } catch (e) {}
                }}
              >
                Join
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CreateClass = () => {
  const router = useRouter();
  // tRPC hook for state invalidation and other things
  const apiUtils = api.useUtils();

  const { mutateAsync: createClass, isLoading } = api.class.create.useMutation({
    onSuccess: async (output) => {
      toast.success(`Class created with code: ${output.classCode}`);
      await apiUtils.enrollment.getAllCurrentUser.invalidate();
      void router.push(`/`);
    },
    onError: () => {
      toast.error(`Could not create class. Class names can't be blank.`);
    },
  });

  // input field for class code
  const [input, setInput] = useState("");

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">Create a new class for your students</p>
            <div className="space-y-2">
              <Label htmlFor="className">Class Name</Label>
              <Input
                id="className"
                placeholder="Enter class name"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    try {
                      void createClass({ className: input });
                      setInput("");
                    } catch (e) {}
                  }
                }}
              />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                disabled={isLoading}
                onClick={() => {
                  try {
                    void createClass({ className: input });
                    setInput("");
                  } catch (e) {}
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function NewClass() {
  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div className="space-y-6 px-4 md:px-6 lg:px-8">
          <JoinClass />
          <CreateClass />
        </div>
      </PageLayout>
    </>
  );
}
