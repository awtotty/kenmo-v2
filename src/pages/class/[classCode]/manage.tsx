import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";
import { type User } from "@clerk/clerk-sdk-node";
import { type RouterOutputs } from "~/utils/api";
import { formatBalance, formatCurrency } from "~/utils/helpers";
import { TrashIcon, BarsArrowDownIcon } from "@heroicons/react/20/solid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Enrollment = RouterOutputs["enrollment"]["getAllByClassCode"][0];
type Transaction = RouterOutputs["transaction"]["getAllByClassCode"]["transactions"][0];
type CustomTransaction = RouterOutputs["transaction"]["getCustomTransactions"][0];

const TransactionFeed = (prop: { classCode: string }) => {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data: data, isLoading: isLoadingTransactions } =
    api.transaction.getAllByClassCode.useQuery({
      classCode: prop.classCode,
      page: page,
      pageSize: pageSize,
    });
  const { data: accounts, isLoading: isLoadingAccounts } = api.account.getAllInClassByClassCode.useQuery({ classCode: prop.classCode });
  const { data: allUsers, isLoading: isLoadingAllUsers } = api.user.getAllByClassCode.useQuery({ classCode: prop.classCode });
  const [transactionsData, setTransactionsData] = useState<(Transaction & { fromUser: User | undefined, toUser: User | undefined })[]>([]);

  const totalPages = Math.ceil((data?.totalRecords ?? 0) / pageSize);

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  // transactions have fromAccountId and toAccountId
  // accounts have ownerId (which is a userId)
  // users have firstName and lastName
  // we want to find the firstName and lastName for the fromUser and toUser for each transaction 
  useEffect(() => {
    const newTransactionData = data?.transactions?.map((transaction: Transaction) => {
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
  }, [data?.transactions, accounts, allUsers]);

  const isLoading = isLoadingTransactions || isLoadingAccounts || isLoadingAllUsers;
  if (isLoading) return <div>Loading...</div>;

  if (!data?.transactions || data?.transactions.length == 0)
    return <div>No transactions found.</div>;

  if (!allUsers || allUsers.length == 0)
    return <div>No users found.</div>;

  return (
    <>
      <div className="w-full max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4 min-w-[150px]">Date</TableHead>
                  <TableHead className="w-1/6 min-w-[100px]">From</TableHead>
                  <TableHead className="w-1/6 min-w-[100px]">To</TableHead>
                  <TableHead className="w-1/12 min-w-[80px]">Amount</TableHead>
                  <TableHead className="w-1/4 min-w-[150px]">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsData?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="truncate">{transaction.createdAt.toLocaleString()}</TableCell>
                    <TableCell className="truncate">
                      {`${transaction.fromUser?.firstName ?? ""} ${transaction.fromUser?.lastName ?? ""}`}
                    </TableCell>
                    <TableCell className="truncate">
                      {`${transaction.toUser?.firstName ?? ""} ${transaction.toUser?.lastName ?? ""}`}
                    </TableCell>
                    <TableCell className="truncate">{formatBalance(transaction.amount)}</TableCell>
                    <TableCell className="truncate" title={transaction.note}>{transaction.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={handlePrevPage}
            >
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
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
  const [sortBy, setSortBy] = useState<"firstName" | "lastName">("lastName");

  const onTheFlyAmountRefs = useRef<Map<number, HTMLInputElement>>(new Map());
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

  const sortByFirstName = (a: Enrollment, b: Enrollment) => {
    const nameA = a.firstName?.toUpperCase() ?? "";
    const nameB = b.firstName?.toUpperCase() ?? "";
    if (nameA < nameB) {
      return -1;
    } else if (nameA > nameB) {
      return 1;
    } else {
      return 0;
    }
  };
  const sortByLastName = (a: Enrollment, b: Enrollment) => {
    const nameA = a.lastName?.toUpperCase() ?? "";
    const nameB = b.lastName?.toUpperCase() ?? "";
    if (nameA < nameB) {
      return -1;
    } else if (nameA > nameB) {
      return 1;
    } else {
      return 0;
    }
  };

  const sortedEnrollments = useMemo(() => {
    if (sortBy == "lastName") {
      return enrollments?.sort(sortByLastName);
    }
    if (sortBy == "firstName") {
      return enrollments?.sort(sortByFirstName);
    }
    else {
      return enrollments;
    }
  }, [enrollments, sortBy]);

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

  const tableColumns = ["On the Fly", "Transaction", "Note", "Name", "Email", "Balance", ""];
  const tableColumnWidths = ["w-1/4 min-w-[200px]", "w-1/4 min-w-[200px]", "w-1/6 min-w-[150px]", "w-1/8 min-w-[120px]", "w-1/6 min-w-[150px]", "w-1/12 min-w-[100px]", "w-12"];

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

  const handleOnTheFlyTransaction = async (enrollment: Enrollment) => {
    const fromAccountId = userAccounts.data?.[0]?.id ?? -1
    const toAccountId = enrollment.checkingAccountId ?? -1
    const amount = parseFloat((document.getElementById(`amount-${enrollment.id}-on-the-fly`) as HTMLInputElement).value);
    const note = (document.getElementById(`note-${enrollment.id}`) as HTMLInputElement).value;
    if (isNaN(amount)) {
      toast.error("Invalid amount");
      return;
    }
    await createTransaction({
      fromAccountId,
      toAccountId,
      amount,
      note
    });
    // clear the note 
    if (noteInputRefs.current.get(enrollment.id) != undefined) {
      noteInputRefs.current.get(enrollment.id)!.value = "";
    }
  }

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div className="space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl mx-auto">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-xl font-semibold">{`Hi ${user.data?.firstName}!`}</h1>
                    <p className="text-muted-foreground">{classInfo.data?.className}</p>
                    <p className="text-sm text-muted-foreground">Class code: {classCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Here begins the bulk actions table */}
        <div className="w-full max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2 min-w-[300px]">Apply transaction to all</TableHead>
                    <TableHead className="w-1/2 min-w-[300px]">Apply note to all</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex w-full gap-1 sm:gap-2">
                        <div className="flex-grow min-w-0">
                          <select
                            className="flex w-full h-full rounded border border-border bg-background px-2 py-2 text-foreground truncate min-w-0"
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
                                {`${formatCurrency(transaction.amount)}  (${transaction.note})`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          onClick={() => {
                            transactionSelectRefs.current.forEach((select) => {
                              select.value = (document.getElementById(`amount-all`) as HTMLSelectElement).value;
                            });
                          }}
                          className="shrink-0"
                        >
                          Apply
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex w-full gap-1 sm:gap-2">
                        <div className="flex-grow min-w-0">
                          <Input
                            placeholder="Note"
                            type="text"
                            id={`note-all`}
                            className="w-full min-w-0"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            noteInputRefs.current.forEach((input) => {
                              input.value = (document.getElementById(`note-all`) as HTMLInputElement).value;
                            });
                          }}
                          className="shrink-0"
                        >
                          Apply
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </div>
          {/* Here ends the bulk actions table */}

          {/* Here begins the student management table */}
          <div className="w-full max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                {tableColumns.map((column, index) => {
                  if (column == "On the Fly") {
                    return (
                      <TableHead key={index} className={tableColumnWidths[index]}>
                        <div className="flex w-full justify-between items-center">
                          <span>{column}</span>
                          <Button
                            size="sm"
                            onClick={() => {
                              sortedEnrollments?.forEach((enrollment) => {
                                if (onTheFlyAmountRefs.current.get(enrollment.id)?.value == "") return;
                                void handleOnTheFlyTransaction(enrollment);
                              });
                            }}
                          >
                            Transfer all
                          </Button>
                        </div>
                      </TableHead>
                    );
                  }
                  else if (column == "Transaction") {
                    return (
                      <TableHead key={index} className={tableColumnWidths[index]}>
                        <div className="flex w-full justify-between items-center">
                          <span>{column}</span>
                          <Button
                            size="sm"
                            onClick={() => {
                              sortedEnrollments?.forEach((enrollment) => {
                                void handleTransaction(enrollment);
                              });
                            }}
                          >
                            Transfer all
                          </Button>
                        </div>
                      </TableHead>
                    );
                  }
                  else if (column == "Name") {
                    return (
                      <TableHead key={index} className={tableColumnWidths[index]}>
                        <div className="flex w-full justify-between items-center">
                          <span>{column}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSortBy(sortBy == "lastName" ? "firstName" : "lastName");
                              toast.success(`Sorted by ${sortBy == "lastName" ? "first name" : "last name"}`);
                            }}
                          >
                            <BarsArrowDownIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                    );
                  }
                  else {
                    return (
                      <TableHead key={index} className={tableColumnWidths[index]}>
                        {column}
                      </TableHead>
                    );
                  }
                })
                }
                    </TableRow>
                  </TableHeader>
                  <TableBody>
              {sortedEnrollments?.map((enrollment: Enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex w-full gap-1 sm:gap-2 items-center">
                          <span className="text-muted-foreground text-sm">$</span>
                          <Input
                            ref={(el) => {
                              if (el) {
                                onTheFlyAmountRefs.current.set(enrollment.id, el)
                              }
                            }}
                            placeholder="Amount"
                            type="number"
                            id={`amount-${enrollment.id}-on-the-fly`}
                            className="flex-grow min-w-0"
                          />
                          <Button
                            size="sm"
                            disabled={createIsLoading}
                            onClick={() => void handleOnTheFlyTransaction(enrollment)}
                            className="shrink-0"
                          >
                            Transfer
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex w-full gap-1 sm:gap-2 items-center">
                          <select
                            ref={(el) => {
                              if (el) {
                                transactionSelectRefs.current.set(enrollment.id, el)
                              }
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 truncate min-w-0"
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
                                {`${formatCurrency(transaction.amount)}  (${transaction.note})`}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={createIsLoading}
                            onClick={() => void handleTransaction(enrollment)}
                            className="shrink-0"
                          >
                            Transfer
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={(el) => {
                            if (el) {
                              noteInputRefs.current.set(enrollment.id, el)
                            }
                          }}
                          placeholder="Note (optional)"
                          type="text"
                          id={`note-${enrollment.id}`}
                          className="w-full min-w-0"
                        />
                      </TableCell>
                      <TableCell className="truncate" title={`${enrollment.firstName} ${enrollment.lastName}`}>
                        {enrollment.firstName} {enrollment.lastName}
                      </TableCell>
                      <TableCell className="truncate" title={enrollment.email}>{enrollment.email}</TableCell>
                      <TableCell className="truncate">
                        {formatBalance(enrollment.checkingAccountBalance)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteIsLoading}
                          onClick={() => {
                            if (!confirm(`Are you sure you want to remove ${enrollment.firstName} ${enrollment.lastName} from this class?`)) return;
                            void deleteEnrollment({ id: enrollment.id });
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
              ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </div>
        {/* Here ends the student management table */}

        <TransactionFeed classCode={classCode} />

          <div className="flex justify-center">
            <Button
              variant="destructive"
              disabled={deleteClassIsLoading}
              onClick={() => {
                if (!confirm("Are you sure you want to delete this class?")) return;
                void deleteClass({ classCode });
              }}
            >
              Delete Class
            </Button>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
