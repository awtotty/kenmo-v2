import { TRPCClientError } from "@trpc/client";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { type RouterOutputs, api } from "~/utils/api";
import { formatBalance } from "~/utils/helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Account = RouterOutputs["account"]["getAllByClassCode"][0];
type Enrollment = RouterOutputs["enrollment"]["getCurrentUserByClassCode"];

export default function ClassPage() {
  const [page, setPage] = useState(1);
  const pageSize = 50;

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
    api.transaction.getAllByAccountId.useQuery({
      accountId: parseInt(fromAccountId, 10),
      page: page,
      pageSize: pageSize,
    });

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

  const totalPages = Math.ceil((transactionsData?.totalRecords ?? 0) / pageSize);
  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };
  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  if (loadingState === "loading") return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div className="px-4 md:px-6 lg:px-8 space-y-6">
        <div>{`Hi ${user?.firstName}!`}</div>
        <div>{classInfo.data?.className}</div>

        <div className="flex flex-col w-full items-center border border-blue-900 rounded p-4 md:max-w-6xl mx-auto">
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
            {`To: ${classBankAccounts ? "Teacher" : "Loading..."} `}
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

        <div className="w-full max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Date</TableHead>
                    <TableHead className="w-[100px]">Amount</TableHead>
                    <TableHead className="w-[300px]">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsData?.transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="truncate">{transaction.createdAt.toLocaleString()}</TableCell>
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
        </div>
      </PageLayout >
    </>
  );
}
