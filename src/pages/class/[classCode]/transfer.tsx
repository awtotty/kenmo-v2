import { TRPCClientError } from "@trpc/client";
import Head from "next/head";
import { useRouter } from "next/router";
import { parse } from "path";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { RouterOutputs, api } from "~/utils/api";

type Account = RouterOutputs["account"]["getAllByClassCode"][0];

export default function ClassPage() {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const classCode =
    typeof router.query.classCode === "string" ? router.query.classCode : "";
  const [loadingState, setLoadingState] = useState<
    "loading" | "invalidClassCode" | "loaded"
  >("loading");
  const [fromItems, setFromItems] = useState<Account[]>([]);
  const [toItems, setToItems] = useState<Account[]>([]);
  const [fromSelectedItem, setFromSelectedItem] = useState("");
  const [toSelectedItem, setToSelectedItem] = useState("");
  const [amountInput, setAmountInput] = useState("0.00");
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    if (!classCode) {
      setLoadingState("invalidClassCode");
    } else {
      setLoadingState("loaded");
    }
  }, [classCode]);

  const classInfo = api.class.getByClassCode.useQuery({ classCode });
  // query the accounts with this class code and set the fromItems and toItems
  const { data: accounts, isLoading: accountsLoading } =
    api.account.getAllByClassCode.useQuery({ classCode });
  useEffect(() => {
    if (accounts) {
      setFromItems(accounts);
      setToItems(accounts);
    }
  }, [accounts]);
  const { mutateAsync: createTransaction, isLoading } =
    api.transaction.create.useMutation({
      onSuccess: async (output) => {
        toast.success(`Transaction complete`);
      },
      onError: (error) => {
        if (error instanceof TRPCClientError) {
          toast.error(`Transaction failed: ${error.message}`);
        } else {
          toast.error(`Transaction failed. Try again later.`);
        }
      },
    });

  if (loadingState === "loading") return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div>{classInfo.data?.className}</div>
        <div>{`Class Code: ${classCode}`}</div>

        <div className="flex-col">
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            From account:
            <select
              className="rounded border-2 border-gray-200 text-gray-700"
              value={fromSelectedItem}
              onChange={(e) => setFromSelectedItem(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an account</option>
              {fromItems.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >{`${item.name} ($${item.balance})`}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            To account:
            <select
              className="rounded border-2 border-gray-200 text-gray-700"
              value={toSelectedItem}
              onChange={(e) => setToSelectedItem(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an account</option>
              {toItems.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >{`${item.name} ($${item.balance})`}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            Amount:
            <input
              className="rounded border-2 border-gray-200 text-gray-700"
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            Note:
            <input
              className="rounded border-2 border-gray-200 text-gray-700"
              type="text"
              value={noteInput}
              placeholder="(Optional)"
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row justify-between gap-4 border-gray-200 py-2">
            <button
              className="rounded bg-slate-400 px-4 py-2 font-bold text-white hover:bg-blue-700"
              disabled={isLoading}
              onClick={async () => {
                try {
                  await createTransaction({
                    fromAccountId: parseInt(fromSelectedItem, 10),
                    toAccountId: parseInt(toSelectedItem, 10),
                    amount: parseFloat(amountInput),
                    note: noteInput,
                  });
                  apiUtils.account.getAllByClassCode.invalidate({ classCode });
                  setAmountInput("0.00");
                } catch (e) {}
              }}
            >
              Transfer
            </button>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
