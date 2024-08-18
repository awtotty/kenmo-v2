import { TRPCClientError } from "@trpc/client";
import Head from "next/head";
import { useRouter } from "next/router";
import { parse } from "path";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { type RouterOutputs, api } from "~/utils/api";

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
  const [fromSelectedItem, setFromSelectedItem] = useState<Account | null>(null);
  const [toSelectedItem, setToSelectedItem] = useState<Account | null>(null);
  const [amountInput, setAmountInput] = useState<string>("0.00");
  const [noteInput, setNoteInput] = useState<string>("");

  const { data: userEnrollment, isLoading: userEnrollmentLoading } =
    api.enrollment.getCurrentUserByClassCode.useQuery({ classCode });
  useEffect(() => {
    setEnrollment(userEnrollment ?? null);
  }, [userEnrollment]);

  const classInfo = api.class.getByClassCode.useQuery({ classCode });
  // query the accounts with this class code and set the fromItems and toItems
  const { data: userAccounts, isLoading: userAccountsLoading } =
    api.account.getAllByClassCode.useQuery({ classCode });
  const { data: classBankAccount, isLoading: classBankAccountLoading } =
    api.account.getBankAccountByClassCode.useQuery({ classCode });

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
    if (!fromSelectedItem || !toSelectedItem) {
      toast.error("Please select accounts");
      return;
    }
    if (fromSelectedItem === toSelectedItem) {
      toast.error("Cannot transfer to the same account");
      return;
    }
    if (parseFloat(amountInput) <= 0) {
      toast.error("Amount must be greater than $0");
      return;
    }
    if (noteInput === "") {
      toast.error("Please enter a note");
      return;
    }
    try {
      await createTransaction({
        fromAccountId: parseInt(fromSelectedItem, 10),
        toAccountId: parseInt(toSelectedItem, 10),
        amount: parseFloat(amountInput),
        note: noteInput,
      });
      await apiUtils.account.getAllByClassCode.invalidate({ classCode });
      setAmountInput("0.00");
    } catch (e) {
    }
  };

  useEffect(() => {
    if (userAccounts) {
      setFromItems(userAccounts);
    }
  }, [userAccounts]);

  useEffect(() => {
    if (classBankAccount) {
      setToItems(classBankAccount);
    }
  }, [classBankAccount]);

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
        <div>{classInfo.data?.className}</div>
        <div>{`Class Code: ${classCode}`}</div>

        <div className="flex-col">
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            From:
            <select
              className="rounded border-2 border-gray-200 text-gray-700 w-48"
              value={fromSelectedItem}
              defaultValue={fromSelectedItem}
              onChange={(e) => setFromSelectedItem(e.target.value)}
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
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            To:
            <select
              className="rounded border-2 border-gray-200 text-gray-700 w-48"
              value={toSelectedItem}
              onChange={(e) => setToSelectedItem(e.target.value)}
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
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2 w-48">
            Amount:
            <input
              className="rounded border-2 border-gray-200 text-gray-700"
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2 w-48">
            Note:
            <input
              className="rounded border-2 border-gray-200 text-gray-700"
              type="text"
              value={noteInput}
              placeholder="What is this for?"
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row justify-between gap-4 border-gray-200 py-2">
            <button
              className="rounded bg-slate-400 px-4 py-2 font-bold text-white hover:bg-blue-700"
              disabled={isLoading}
              onClick={() => void handleTransfer()}
            >
              Transfer
            </button>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
