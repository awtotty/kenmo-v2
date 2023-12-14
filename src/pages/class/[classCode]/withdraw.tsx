import { UserButton } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import router, { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";

import { RouterInputs, RouterOutputs, api } from "~/utils/api";

export default function ClassPage() {

  const router = useRouter()
  const [isButtonDisabled, setButtonDisabled] = useState(false);

  // define the mutation and what to do when it succeeds
  const { mutate: withdraw, isLoading: withdrawIsLoading } = api.transaction.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal successful!");
      setTimeout(() => {
        setButtonDisabled(false);
        // router.push("/");
      }, 2000);
    },
    onError: (error) => {
      toast.error(`Withdrawal failed: ${error.message}`);
      setButtonDisabled(false);
    },
  });

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <PageLayout>
        <p> Class code: {router.query.classCode}</p>
        Withdraw page

        <button
          className="bg-red-500 hover:bg-red-300 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (isButtonDisabled) return;
            setButtonDisabled(true);
            withdraw({
              from: 1,
              to: 2,
              amount: 100,
              note: "test",
            });
          }}
          disabled={isButtonDisabled || withdrawIsLoading}
        >Do it</button>
        
      </PageLayout >
    </>
  );
}
