import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";
import { type User } from "@clerk/clerk-sdk-node";
import { type RouterOutputs } from "~/utils/api";
import { TrashIcon, ChevronDownIcon } from "@heroicons/react/20/solid";

type Enrollment = RouterOutputs["enrollment"]["getAllByClassCode"][0];
type Transaction = RouterOutputs["transaction"]["getAllByClassCode"][0];
type CustomTransaction = RouterOutputs["transaction"]["getCustomTransactions"][0];

const TransactionFeed = (prop: { classCode: string }) => {
  const { data: transactions, isLoading: isLoadingTransactions } =
    api.transaction.getAllByClassCode.useQuery(prop.classCode);
  const { data: accounts, isLoading: isLoadingAccounts } = api.account.getAllInClassByClassCode.useQuery({ classCode: prop.classCode });
  const { data: allUsers, isLoading: isLoadingAllUsers } = api.user.getAllByClassCode.useQuery({ classCode: prop.classCode });
  const [transactionsData, setTransactionsData] = useState<(Transaction & { fromUser: User | undefined, toUser: User | undefined })[]>([]);

  // transactions have fromAccountId and toAccountId
  // accounts have ownerId (which is a userId)
  // users have firstName and lastName
  // we want to find the firstName and lastName for the fromUser and toUser for each transaction 
  useEffect(() => {
    const newTransactionData = transactions?.map((transaction) => {
      const fromAccount = accounts?.find((account) => account.id == transaction.fromAccountId);
      const toAccount = accounts?.find((account) => account.id == transaction.toAccountId);
      const fromUser = allUsers?.find((user) => user.id == fromAccount?.ownerId);
      const toUser = allUsers?.find((user) => user.id == toAccount?.ownerId);
      return {
        ...transaction,
        fromUser: fromUser,
        toUser: toUser
      };
    });
    if (newTransactionData) {
      setTransactionsData(newTransactionData);
    }
  }, [transactions, accounts, allUsers]);

  const isLoading = isLoadingTransactions || isLoadingAccounts || isLoadingAllUsers;
  if (isLoading) return <div>Loading...</div>;

  if (!transactions || transactions.length == 0)
    return <div>No transactions found.</div>;

  if (!allUsers || allUsers.length == 0)
    return <div>No users found.</div>;

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
            {transactionsData?.map((transaction) => (
              <tr
                key={transaction.id}
              >
                <td>{transaction.createdAt.toLocaleString()}</td>
                <td>
                  {`${transaction.fromUser?.firstName ?? ""} ${transaction.fromUser?.lastName ?? ""}`}
                </td>
                <td>
                  {`${transaction.toUser?.firstName ?? ""} ${transaction.toUser?.lastName ?? ""}`}
                </td>
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
  const classCode = router.query.classCode as string;
  const [loadingState, setLoadingState] = useState<
    "loading" | "invalidClassCode" | "invalidEnrollments" | "loaded"
  >("loading");
  const { data: enrollments } =
    api.enrollment.getAllByClassCode.useQuery({ classCode });
  const [possibleTransactions, setPossibleTransactions] = useState<CustomTransaction[]>([]);
  const customTransactions = api.transaction.getCustomTransactions.useQuery();
  const user = api.user.getCurrentUser.useQuery();
  const userAccounts = api.account.getAllByClassCode.useQuery({ classCode });
  const classInfo = api.class.getByClassCode.useQuery({ classCode });

  const transactionSelectRefs = useRef<Map<number, HTMLSelectElement>>(new Map());
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

  const tableColumns = ["Transaction", "Note", "Name", "Email", "Balance", ""];
  const tableColumnWidths = ["300px", "300px", "100px", "50px", "100px", "20px"];

  const handleTransaction = async (enrollment: Enrollment) => {
    // TODO: Replace with with a useRef
    const id = parseInt((document.getElementById(`amount-${enrollment.id}`) as HTMLSelectElement).value);
    const tempTransaction = possibleTransactions.find((transaction) => transaction.id == id);
    if (!tempTransaction) {
      toast.error("Could not find transaction");
      return;
    };
    const fromAccountId = userAccounts.data?.[0]?.id ?? -1
    const toAccountId = enrollment.checkingAccountId ?? -1
    // check for note override
    if (noteInputRefs.current.get(enrollment.id)?.value != "") {
      tempTransaction.note = noteInputRefs.current.get(enrollment.id)?.value ?? tempTransaction.note;
    }
    await createTransaction({
      fromAccountId,
      toAccountId,
      ...tempTransaction
    });
    // clear the note 
    if (noteInputRefs.current.get(enrollment.id) != undefined) {
      noteInputRefs.current.get(enrollment.id)!.value = "";
    }
  };

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div>{`Hi ${user.data?.firstName}!`}</div>
        <div>{classInfo.data?.className}</div>
        <div>Class code: {classCode}</div>

        {/* Here begins the bulk actions table */}
        <div className="overflow-x-auto">
          <table className="md:min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="w-1/2 border border-gray-300 bg-gray-700 p-2">Apply transaction to all</th>
                <th className="w-1/2 border border-gray-300 bg-gray-700 p-2">Apply note to all</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2">
                  <div className="flex w-full flow-root">
                    <div className="flex w-3/4 float-left">
                      <select
                        className="flex w-full h-full rounded border border-gray-400 bg-white px-2 py-2 text-gray-700"
                        name="amount"
                        id={`amount-all`}
                        defaultValue={undefined}
                      >
                        <option value={undefined}>Select a transaction</option>
                        {possibleTransactions.map((transaction) => (
                          <option
                            key={transaction.id}
                            className="flex w-full"
                            value={transaction.id}
                          >
                            {`$${transaction.amount} ${transaction.note}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex w-1/4 float-right">
                      <button
                        className="flex w-full justify-center rounded bg-blue-500 px-2 py-1 hover:bg-blue-600"
                        onClick={() => {
                          transactionSelectRefs.current.forEach((select) => {
                            select.value = (document.getElementById(`amount-all`) as HTMLSelectElement).value;
                          });
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  <div className="flex w-full flow-root">
                    <div className="flex w-3/4 float-left">
                      <input
                        placeholder="Note"
                        className="flex w-full rounded border border-gray-400 bg-white px-2 py-1 text-gray-700"
                        type="text"
                        id={`note-all`}
                      />
                    </div>
                    <div className="flex w-1/4 float-right">
                      <button
                        className="flex w-full justify-center rounded bg-blue-500 px-2 py-1 font-bold text-white hover:bg-blue-600"
                        onClick={() => {
                          noteInputRefs.current.forEach((input) => {
                            input.value = (document.getElementById(`note-all`) as HTMLInputElement).value;
                          });
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          {/* Here ends the bulk actions table */}
          <div className="flex gap-8 justify-center">
            <ChevronDownIcon className="h-5 w-5" />
          </div>

          {/* Here begins the management table */}
          <table className="md:min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                {tableColumns.map((column, index) => {
                  if (column == "Transaction") {
                    return (
                      <th key={index} className={`min-w-[${tableColumnWidths[index]}] border border-gray-300 bg-gray-700 p-2`}>
                        <div className="flex w-full flow-root">
                          <div className="flex justify-center float-left">
                            {column}
                          </div>
                          <div className="flex float-right">
                            <button
                              className="rounded bg-blue-500 px-2 py-1 font-bold text-white hover:bg-blue-600"
                              onClick={() => {
                                enrollments?.forEach((enrollment) => {
                                  void handleTransaction(enrollment);
                                });
                              }}
                            >
                              Transfer all
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  }
                  return (
                    <th key={index} className={`min-w-[${tableColumnWidths[index]}] border border-gray-300 bg-gray-700 p-2`}>{column}</th>
                  );
                })
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
                    <div className="flex w-full flow-root">
                      <div className="flex float-left">
                        <select
                          ref={(el) => {
                            if (el) {
                              transactionSelectRefs.current.set(enrollment.id, el)
                            }
                          }}
                          className="flex h-full rounded border border-gray-400 bg-white px-2 py-2 text-gray-700"
                          name="amount"
                          id={`amount-${enrollment.id}`}
                          defaultValue={undefined}
                        >
                          <option value={undefined}>Select a transaction</option>
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
                      <div className="flex float-right">
                        <button
                          className="rounded bg-blue-500 px-2 py-1 hover:bg-blue-600"
                          disabled={createIsLoading}
                          onClick={() => void handleTransaction(enrollment)}
                        >
                          Transfer
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      ref={(el) => {
                        if (el) {
                          noteInputRefs.current.set(enrollment.id, el)
                        }
                      }}
                      placeholder="Note (optional)"
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
                  <td>
                    <button
                      className="rounded bg-red-400 px-2 py-1 font-bold text-white hover:bg-red-500"
                      disabled={deleteIsLoading}
                      onClick={() => {
                        if (!confirm(`Are you sure you want to remove ${enrollment.firstName} ${enrollment.lastName} from this class?`)) return;
                        void deleteEnrollment({ id: enrollment.id });
                      }}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Here ends the management table */}

        <div>
          <TransactionFeed classCode={classCode} />
        </div>

        <div>
          <button
            className="rounded bg-red-400 px-4 py-2 hover:bg-red-500"
            disabled={deleteClassIsLoading}
            onClick={() => {
              if (!confirm("Are you sure you want to delete this class?")) return;
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
