import { clerkClient } from "@clerk/nextjs";
import { create } from "domain";
import Head from "next/head";
import { useState } from "react";
import toast from "react-hot-toast";
import { ClassCard } from "~/components/classCard";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";

const AccountFeed = () => {
  const { data: enrollments, isLoading } = api.enrollment.getAllCurrentUser.useQuery();

  if (isLoading) return <div>Loading...</div>;

  if (!enrollments || enrollments.length == 0) return <div>No enrollments found.</div>;

  return (
    <>
      <div className="flex flex-col justify-center w-full md: max-w-2xl items-center gap-4">
        {enrollments?.map((enrollment) => (
          <ClassCard enrollment={enrollment} numTransactions={5} key={enrollment.id} />
        ))}
      </div>
    </>
  );
}

const JoinClass = () => {
  // tRPC hook for state invalidation and other things
  const apiUtils = api.useUtils();

  const { mutateAsync: joinClass, isLoading } = api.class.join.useMutation({
    onSuccess: async (output) => {
      toast.success(`Joined class with code: ${output.classCode}`)
      await apiUtils.enrollment.getAllCurrentUser.invalidate();
    },
    onError: (error) => {
      toast.error(`Class creation failed: ${error.message}`)
    }
  })

  // input field for class code
  const [input, setInput] = useState("");

  return (
    <>
      <div>
        <input
          placeholder="Class Code"
          className="outline-none text-size-2xl flex-grow p-2 text-slate-800"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              try {
                await joinClass({ classCode: input });
              } catch (e) {
              }
            }
          }}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={isLoading}
          onClick={async () => {
            try {
              await joinClass({ classCode: input });
            } catch (e) {
            }
          }}>Join Class</button>
      </div>
    </>
  )
};

const CreateClass = () => {
  // tRPC hook for state invalidation and other things
  const apiUtils = api.useUtils();

  const { mutateAsync: createClass, isLoading } = api.class.create.useMutation({
    onSuccess: async (output) => {
      toast.success(`Class created with code: ${output.classCode}`)
      await apiUtils.enrollment.getAllCurrentUser.invalidate();
    },
    onError: (error) => {
      toast.error(`Class creation failed: ${error.message}`)
    }
  })

  return (
    <>
      <div className="flex flex-col justify-center w-full md: max-w-2xl items-center gap-4">
        <button
          className="bg-slate-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          onClick={() => createClass({ className: "Test Class" })}
        >Create Class</button>
      </div>
    </>
  )
};

export default function Home() {
  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <AccountFeed />

        <JoinClass />
        <CreateClass />
      </PageLayout>
    </>
  );
}
