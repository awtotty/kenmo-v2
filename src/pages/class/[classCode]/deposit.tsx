import { UserButton, useUser } from "@clerk/nextjs";
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
  const [amount, setAmount] = useState(0);

  // define the mutation and what to do when it succeeds
  const { mutate: deposit, isLoading: depositIsLoading } = api.transaction.depositToBank.useMutation({
    onSuccess: () => {
      toast.success("Deposit successful!");
      setAmount(0);

      setTimeout(() => {
        setButtonDisabled(false);
        // router.push("/");
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Deposit failed: ${error.message}`);
      setButtonDisabled(false);
    },
  });

  const userId = useUser().user?.id;
  if (!userId) return <div>Not logged in</div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <PageLayout>
        <p> Class code: {router.query.classCode}</p>
        Deposit page

        <input
          className="text-black border rounded py-2 px-4 bg-gray-100 focus:outline-none focus:ring focus:border-blue-300"
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          placeholder="Amount"
        />
        <input className="text-black border rounded py-2 px-4 bg-gray-100 focus:outline-none focus:ring focus:border-blue-300" type="text" placeholder="Note" />

        <button
          className="bg-red-500 hover:bg-red-300 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (isButtonDisabled) return;
            setButtonDisabled(true);
            deposit({
              userId: userId as string,
              classCode: router.query.classCode as string,
              amount: amount,
              note: "Deposit from class",
            });
          }}
          disabled={isButtonDisabled || depositIsLoading}
        >Do it</button>

      </PageLayout >
    </>
  );
}
