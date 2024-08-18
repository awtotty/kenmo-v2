import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";
import { type RouterOutputs } from "~/utils/api";

type Enrollment = RouterOutputs["enrollment"]["getAllByClassCode"][0];
type Transaction = RouterOutputs["transaction"]["getAllByClassCode"][0];
type CustomTransaction = RouterOutputs["transaction"]["getCustomTransactions"][0];

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
        {transactions?.map((transaction: Transaction) => (
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
  const apiUtils = api.useUtils();
  const router = useRouter();
  const classCode =
    typeof router.query.classCode === "string" ? router.query.classCode : "";
  const [loadingState, setLoadingState] = useState<
    "loading" | "invalidClassCode" | "invalidEnrollments" | "loaded"
  >("loading");
  const { data: enrollments } =
    api.enrollment.getAllByClassCode.useQuery({ classCode });
  const [possibleTransactions, setPossibleTransactions] = useState<CustomTransaction[]>([]);
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
      setPossibleTransactions(customTransactions.data);
    }
  }, [customTransactions.data, possibleTransactions.length]); // Dependency array ensures this runs only when customTransactions.data changes

  const { mutateAsync: deleteEnrollment, isLoading: deleteIsLoading } =
    api.enrollment.delete.useMutation({
      onSuccess: () => {
        toast.success("Enrollment deleted");
        void apiUtils.enrollment.getAllByClassCode.invalidate();
      },
      onError: () => {
        toast.error("Could not delete enrollment");
      },
    });
  const { mutateAsync: createTransaction, isLoading: createIsLoading } =
    api.transaction.create.useMutation({
      onSuccess: () => {
        toast.success("Transaction created");
        void apiUtils.enrollment.getAllByClassCode.invalidate();
        void apiUtils.transaction.getAllByClassCode.invalidate();
      },
      onError: () => {
        toast.error("Could not create transaction");
      },
    });
  const { mutateAsync: deleteClass, isLoading: deleteClassIsLoading } =
    api.class.delete.useMutation({
      onSuccess: () => {
        toast.success("Class deleted");
        void router.push("/");
      },
      onError: () => {
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
            <div>Balance</div>
            <div>Remove</div>
          </div>
        </div>
        <div className="flex flex-col">
          {enrollments?.map((enrollment: Enrollment) => (
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
                    <option
                      key={transaction.id}
                      value={transaction.id}
                    >
                      {`$${transaction.amount} ${transaction.note}`}
                    </option>
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
                    const tempTransaction = possibleTransactions.find((transaction) => transaction.id == id);
                    if (!tempTransaction) {
                      toast.error("Could not find transaction");
                      return;
                    };
                    const fromAccountId = userAccounts.data?.[0]?.id ?? -1
                    const toAccountId = enrollment.checkingAccountId ?? -1
                    if (!tempTransaction.note) tempTransaction.note = "";
                    void createTransaction({ 
                      fromAccountId,
                      toAccountId,
                      ...tempTransaction
                    });
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
                {enrollment.checkingAccountBalance ??
                  enrollment.checkingAccountBalance == 0
                  ? `$${enrollment.checkingAccountBalance}`
                  : "-"}
              </div>
              <div>
                <button
                  className="rounded bg-red-400 px-2 py-1 font-bold text-white hover:bg-red-700"
                  disabled={deleteIsLoading}
                  onClick={() => {
                    void deleteEnrollment({ id: enrollment.id });
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
              void deleteClass({ classCode });
            }}
          >
            Delete Class
          </button>
        </div>
      </PageLayout>
    </>
  );
}
