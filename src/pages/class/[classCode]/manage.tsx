import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
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
      <div className="">
        Recent Transactions
      </div>

      <div className="overflow-x-auto">
        <table className="md:min-w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="min-w-[200px] border border-gray-300 bg-gray-700 p-2">Date</th>
              <th className="min-w-[100px] border border-gray-300 bg-gray-700 p-2">From</th>
              <th className="min-w-[100px] border border-gray-300 bg-gray-700 p-2">To</th>
              <th className="min-w-[50px] border border-gray-300 bg-gray-700 p-2">Amount</th>
              <th className="min-w-[100px] border border-gray-300 bg-gray-700 p-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((transaction: Transaction) => (
              <tr
                key={transaction.id}
              >
                <td>{transaction.createdAt.toLocaleString()}</td>
                <td>{transaction.fromAccountId}</td>
                <td>{transaction.toAccountId}</td>
                <td>${transaction.amount}</td>
                <td>{transaction.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  const noteInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

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

  const tableColumns = ["Transaction", "Note", "Name", "Email", "Balance"];
  const tableColumnWidths = ["300px", "300px", "100px", "50px", "100px"];

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
        <div className="overflow-x-auto">
          <table className="md:min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                {tableColumns.map((column, index) => (
                  <th key={index} className={`min-w-[${tableColumnWidths[index]}] border border-gray-300 bg-gray-700 p-2`}>{column}</th>
                ))
                }
              </tr>
            </thead>
            <tbody>
              {enrollments?.map((enrollment: Enrollment) => (
                <tr
                  className="w-full"
                  key={enrollment.id}
                >
                  <td className="border border-gray-300 p-2">
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
                        tempTransaction.note = noteInputRefs.current.get(enrollment.id)?.value ?? tempTransaction.note;
                        void createTransaction({
                          fromAccountId,
                          toAccountId,
                          ...tempTransaction
                        });
                      }}
                    >
                      Transfer
                    </button>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      ref={(el) => { 
                        if (el) {
                          noteInputRefs.current.set(enrollment.id, el)
                        }
                      }}
                      placeholder="Note"
                      className="rounded border border-gray-400 bg-white px-2 py-1 text-gray-700"
                      type="text"
                      id={`note-${enrollment.id}`}
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    {enrollment.firstName} {enrollment.lastName}
                  </td>
                  <td className="border border-gray-300 p-2">{enrollment.email}</td>
                  <td className="border border-gray-300 p-2">
                    {enrollment.checkingAccountBalance ??
                      enrollment.checkingAccountBalance == 0
                      ? `$${enrollment.checkingAccountBalance}`
                      : "-"}
                  </td>
                  {/*<div>
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
              */}
                </tr>
              ))}
            </tbody>

          </table>
        </div>

        <div>
          <TransactionFeed classCode={classCode} />
        </div>


        {/*
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
          */}
      </PageLayout>
    </>
  );
}
