import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";

const JoinClass = () => {
  const router = useRouter();
  // tRPC hook for state invalidation and other things
  const apiUtils = api.useUtils();

  const { mutateAsync: joinClass, isLoading } = api.class.join.useMutation({
    onSuccess: async (output) => {
      toast.success(`Joined class with code: ${output.classCode}`);
      await apiUtils.enrollment.getAllCurrentUser.invalidate();
      router.push(`/`);
    },
    onError: (error) => {
      toast.error(`Could not join class. Do you have a valid class code?`);
    },
  });

  // input field for class code
  const [input, setInput] = useState("");

  return (
    <>
      <div>Join an existing class with a class code from your teacher:</div>
      <div>
        <input
          placeholder="Class Code"
          className="text-size-2xl flex-grow p-2 text-slate-800 outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              try {
                await joinClass({ classCode: input });
                setInput("");
              } catch (e) {}
            }
          }}
        />
        <button
          className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
          disabled={isLoading}
          onClick={async () => {
            try {
              await joinClass({ classCode: input });
              setInput("");
            } catch (e) {}
          }}
        >
          Join
        </button>
      </div>
    </>
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
      router.push(`/`);
    },
    onError: (error) => {
      toast.error(`Could not create class. Class names can't be blank.`);
    },
  });

  // input field for class code
  const [input, setInput] = useState("");

  return (
    <>
      <div>Create a new class for your students:</div>
      <div>
        <input
          placeholder="Class Name"
          className="text-size-2xl flex-grow p-2 text-slate-800 outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              try {
                await createClass({ className: input });
                setInput("");
              } catch (e) {}
            }
          }}
        />
        <button
          className="rounded bg-slate-400 px-4 py-2 font-bold text-white hover:bg-blue-700"
          disabled={isLoading}
          onClick={async () => {
            try {
              await createClass({ className: input });
              setInput("");
            } catch (e) {}
          }}
        >
          Create
        </button>
      </div>
    </>
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
        <JoinClass />
        <div className="mt-4"></div>
        <CreateClass />
      </PageLayout>
    </>
  );
}
