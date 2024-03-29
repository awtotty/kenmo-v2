import { create } from "domain";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";

type Transaction = { id: number, amount: number; fromAccountId: number; toAccountId: number; note: string };

const TransactionFeed = (prop: { classCode: string }) => {
  const { data: transactions, isLoading } =
    api.transaction.getAllByClassCode.useQuery(prop.classCode);
  if (isLoading) return <div>Loading...</div>;
  if (!transactions || transactions.length == 0)
    return <div>No transactions found.</div>;

  return (
    <>
      <div className="my-2 flex flex-col gap-4 border-b-2 border-gray-200 text-center">
        Recent Transactions
      </div>
      <div className="md: flex w-full max-w-2xl flex-col items-center justify-center gap-4">
        {transactions?.map((transaction) => (
          <div
            key={transaction.id}
            className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2"
          >
            <div>${transaction.amount}</div>
            <div>
              {transaction.fromAccountId} {"=>"} {transaction.toAccountId}
            </div>
            <div>{transaction.createdAt.toTimeString()}</div>
            <div>{transaction.note}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default function ClassPage() {
  const sampleTransactions = [
    { id: 1, amount: 5, fromAccountId: -1, toAccountId: -1, note: "Built-in transaction" },
    { id: 2, amount: -10, fromAccountId: -1, toAccountId: -1, note: "Built-in transaction" },
    { id: 3, amount: -5, fromAccountId: -1, toAccountId: -1, note: "Built-in transaction" },
    { id: 4, amount: 10, fromAccountId: -1, toAccountId: -1, note: "Built-in transaction" },
  ]

  const apiUtils = api.useUtils();
  const router = useRouter();
  const classCode =
    typeof router.query.classCode === "string" ? router.query.classCode : "";
  const [loadingState, setLoadingState] = useState<
    "loading" | "invalidClassCode" | "invalidEnrollments" | "loaded"
  >("loading");
  const { data: enrollments, isLoading } =
    api.enrollment.getAllByClassCode.useQuery({ classCode });
  const [possibleTransactions, setPossibleTransactions] = useState<Transaction[]>(sampleTransactions);
  const customTransactions = api.transaction.getCustomTransactions.useQuery();
  const userAccounts = api.account.getAllByClassCode.useQuery({ classCode });
  const classInfo = api.class.getByClassCode.useQuery({ classCode });

  useEffect(() => {
    if (!classCode) {
      setLoadingState("invalidClassCode");
    } else {
      setLoadingState("loaded");
    }
  }, [classCode]);

  useEffect(() => {
    if (!enrollments || enrollments.length == 0) {
      setLoadingState("invalidEnrollments");
    } else {
      setLoadingState("loaded");
    }
  }, [enrollments]);

  useEffect(() => {
    if (customTransactions.data && customTransactions.data.length != 0) {
      setPossibleTransactions(customTransactions.data.map((transaction, index) => ({
        id: possibleTransactions.length + index + 1, 
        amount: transaction.amount,
        fromAccountId: -1, 
        toAccountId: -1,
        note: transaction.note ?? "",
      })));
    }
  }, [customTransactions.data]); // Dependency array ensures this runs only when customTransactions.data changes

  const { mutateAsync: deleteEnrollment, isLoading: deleteIsLoading } =
    api.enrollment.delete.useMutation({
      onSuccess: () => {
        toast.success("Enrollment deleted");
        apiUtils.enrollment.getAllByClassCode.invalidate();
      },
      onError: (error) => {
        toast.error("Could not delete enrollment");
      },
    });
  const { mutateAsync: createTransaction, isLoading: createIsLoading } =
    api.transaction.create.useMutation({
      onSuccess: () => {
        toast.success("Transaction created");
        apiUtils.enrollment.getAllByClassCode.invalidate();
        apiUtils.transaction.getAllByClassCode.invalidate();
      },
      onError: (error) => {
        toast.error("Could not create transaction");
      },
    });
  const { mutateAsync: deleteClass, isLoading: deleteClassIsLoading } =
    api.class.delete.useMutation({
      onSuccess: () => {
        toast.success("Class deleted");
        router.push("/");
      },
      onError: (error) => {
        toast.error("Could not delete class");
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
        <div>Class code: {classCode}</div>
        {/* list all enrollments */}
        <div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            <div>Amount</div>
            <div>Transfer</div>
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Checking</div>
            <div>Investment</div>
            <div>Remove</div>
          </div>
        </div>
        <div className="flex flex-col">
          {enrollments?.map((enrollment) => (
            <div
              className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2"
              key={enrollment.id}
            >
              <div>
                <select
                  className="rounded border border-gray-400 bg-white px-2 py-1 text-gray-700"
                  name="amount"
                  id={`amount-${enrollment.id}`}
                  defaultValue={possibleTransactions[0]?.id}
                >
                  {possibleTransactions.map((transaction) => (
                    <option value={transaction.id}>{`$${transaction.amount} ${transaction.note}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  className="rounded bg-blue-400 px-2 py-1 font-bold text-white hover:bg-blue-700"
                  disabled={createIsLoading}
                  onClick={() => {
                    // use the value of the select to create a transaction
                    const id = parseInt((document.getElementById(`amount-${enrollment.id}`) as HTMLSelectElement).value);
                    let tempTransaction = possibleTransactions.find((transaction) => transaction.id == id);
                    if (!tempTransaction) {
                      toast.error("Could not find transaction");
                      return;
                    };
                    tempTransaction.fromAccountId = userAccounts.data?.[0]?.id ?? -1
                    tempTransaction.toAccountId = enrollment.checkingAccountId ?? -1
                    console.log(tempTransaction);
                    createTransaction(tempTransaction);
                  }}
                >
                  Transfer
                </button>
              </div>
              <div>
                {enrollment.firstName} {enrollment.lastName}
              </div>
              <div>{enrollment.email}</div>
              <div>{enrollment.role}</div>
              <div>
                {enrollment.checkingAccountBalance ||
                  enrollment.checkingAccountBalance == 0
                  ? `$${enrollment.checkingAccountBalance}`
                  : "-"}
              </div>
              <div>
                {enrollment.investmentAccountBalance ||
                  enrollment.investmentAccountBalance == 0
                  ? `$${enrollment.investmentAccountBalance}`
                  : "-"}
              </div>
              <div>
                <button
                  className="rounded bg-red-400 px-2 py-1 font-bold text-white hover:bg-red-700"
                  disabled={deleteIsLoading}
                  onClick={() => {
                    deleteEnrollment({ id: enrollment.id });
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <TransactionFeed classCode={classCode} />
        </div>

        <div>
          <button
            className="rounded bg-red-400 px-4 py-2 font-bold text-white hover:bg-red-700"
            disabled={deleteClassIsLoading}
            onClick={() => {
              deleteClass({ classCode });
            }}
          >
            Delete Class
          </button>
        </div>
      </PageLayout>
    </>
  );
}
