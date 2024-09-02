import { TRPCClientError } from "@trpc/client";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { type RouterOutputs, api } from "~/utils/api";
import { formatBalance } from "~/utils/helpers";

type Account = RouterOutputs["account"]["getAllByClassCode"][0];
type Enrollment = RouterOutputs["enrollment"]["getCurrentUserByClassCode"];

export default function ClassPage() {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const classCode =
    typeof router.query.classCode === "string" ? router.query.classCode : "";
  const [loadingState, setLoadingState] = useState<
    "loading" | "invalidClassCode" | "loaded"
  >("loading");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [fromItems, setFromItems] = useState<Account[]>([]);
  const [toItems, setToItems] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const { data: transactionsData } = 
    api.transaction.getAllByAccountId.useQuery(parseInt(fromAccountId, 10));

  const user = api.user.getCurrentUser.useQuery().data;

  const { data: userEnrollment } =
    api.enrollment.getCurrentUserByClassCode.useQuery({ classCode });
  useEffect(() => {
    setEnrollment(userEnrollment ?? null);
  }, [userEnrollment]);

  const classInfo = api.class.getByClassCode.useQuery({ classCode });
  // query the accounts with this class code and set the fromItems and toItems
  const { data: userAccounts } =
    api.account.getAllByClassCode.useQuery({ classCode });
  const { data: classBankAccounts } =
    api.account.getBankAccountsByClassCode.useQuery({ classCode });

  const { mutateAsync: createTransaction, isLoading } =
    api.transaction.create.useMutation({
      onSuccess: () => {
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

  const handleTransfer = async () => {
    if (fromAccountId === "" || toAccountId === "") {
      toast.error("Couldn't find accounts. Try refreshing the page.");
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error("Cannot transfer to the same account");
      return;
    }
    if (!amountInput) {
      toast.error("Please enter an amount");
      return;
    }
    if (amountInput == "" || parseFloat(amountInput) <= 0) {
      toast.error("Amount must be greater than $0");
      return;
    }
    if (noteInput === "") {
      toast.error("Please enter a note");
      return;
    }
    try {
      await createTransaction({
        fromAccountId: parseInt(fromAccountId, 10),
        toAccountId: parseInt(toAccountId, 10),
        amount: parseFloat(amountInput),
        note: noteInput,
      });
      await apiUtils.account.getAllByClassCode.invalidate({ classCode });
      setAmountInput("0.00");
      setNoteInput("");
    } catch (e) {
    }
  };

  useEffect(() => {
    if (userAccounts) {
      setFromItems(userAccounts);
      // WARNING: this is hacky and just chooses the first account
      setFromAccountId(userAccounts[0]?.id.toString() ?? "");
    }
  }, [userAccounts]);

  useEffect(() => {
    if (classBankAccounts) {
      setToItems(classBankAccounts);
      setToAccountId(classBankAccounts[0]?.id.toString() ?? "");
    }
  }, [classBankAccounts]);

  useEffect(() => {
    if (!classCode) {
      setLoadingState("invalidClassCode");
    } else {
      setLoadingState("loaded");
    }
  }, [classCode]);

  if (loadingState === "loading") return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div>{`Hi ${user?.firstName}!`}</div>
        <div>{classInfo.data?.className}</div>

        <div className="flex flex-col w-full items-center border border-blue-900 rounded p-4 md:max-w-2xl">
          <div className="flex flex-row justify-between gap-4 py-2">
            {`From: ${userAccounts ? userAccounts[0]?.name ?? "No account found" : "Loading..."} `}
            {userAccounts ? formatBalance(userAccounts[0]?.balance) : "Loading..."}
            {/*
            <select
              className="rounded border-2 border-gray-200 text-gray-700 w-48"
              value={fromAccountId}
              defaultValue={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an account</option>
              {fromItems.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >{`${enrollment?.firstName}${enrollment?.firstName ? "'s" : ""} ${item.name} ($${item.balance})`}</option>
              ))}
            </select>
            */}
          </div>
          <div className="flex flex-row justify-between gap-4 py-2">
            {`To: ${classBankAccounts ? "Teacher" ?? "No account found" : "Loading..."} `}
            {/*
            <select
              className="rounded border-2 border-gray-200 text-gray-700 w-48"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an account</option>
              {toItems.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >{`${enrollment?.className} Bank ${item.id}`}</option>
              ))}
            </select>
            */}
          </div>
          <div className="flex flex-row justify-between gap-4 py-2 w-48">
            Amount
            <span className="-mr-5">$</span>
            <input
              className="flex float-right w-1/2 border border-gray-300 rounded-md p-2 text-slate-700"
              type="text"
              id="amount"
              value={amountInput ?? undefined}
              placeholder="0.00"
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
          <div className="flex flex-row justify-between gap-4 py-2 w-48">
            Note
            <input
              className="flex float-right w-full border border-gray-300 rounded-md p-2 text-slate-700"
              type="text"
              value={noteInput}
              placeholder="What is this for?"
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row justify-between py-2 border-gray-200">
            <button
              className="rounded bg-blue-500 px-4 py-2 hover:bg-blue-600"
              disabled={isLoading}
              onClick={() => void handleTransfer()}
            >
              Transfer
            </button>
          </div>
        </div>

        <div>
          <div className="">
            Recent Transactions
          </div>

          <div className="overflow-x-auto">
            <table className="md:min-w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="min-w-[200px] border border-gray-300 bg-gray-700 p-2">Date</th>
                  <th className="min-w-[50px] border border-gray-300 bg-gray-700 p-2">Amount</th>
                  <th className="min-w-[100px] border border-gray-300 bg-gray-700 p-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {transactionsData?.map((transaction) => (
                  <tr
                    key={transaction.id}
                  >
                    <td>{transaction.createdAt.toLocaleString()}</td>
                    <td>{formatBalance(transaction.amount)}</td>
                    <td>{transaction.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageLayout >
    </>
  );
}
