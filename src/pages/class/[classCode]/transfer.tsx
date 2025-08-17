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
        <div className="w-full max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-semibold">{`Hi ${user?.firstName}!`}</h1>
                  <p className="text-muted-foreground">{classInfo.data?.className}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-row justify-between items-center">
                <span className="font-medium">From:</span>
                <div className="text-right">
                  <div>{userAccounts ? userAccounts[0]?.name ?? "No account found" : "Loading..."}</div>
                  <div className="text-sm text-muted-foreground">
                    {userAccounts ? formatBalance(userAccounts[0]?.balance) : "Loading..."}
                  </div>
                </div>
              </div>
              <div className="flex flex-row justify-between items-center">
                <span className="font-medium">To:</span>
                <span>{classBankAccounts ? "Teacher" : "Loading..."}</span>
              </div>
              <div className="flex flex-row justify-between items-center gap-4">
                <span className="font-medium">Amount:</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <input
                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    type="text"
                    id="amount"
                    value={amountInput ?? ""}
                    placeholder="0.00"
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-row justify-between items-center gap-4">
                <span className="font-medium">Note:</span>
                <input
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  type="text"
                  value={noteInput}
                  placeholder="What is this for?"
                  onChange={(e) => setNoteInput(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-center pt-2">
                <Button
                  disabled={isLoading}
                  onClick={() => void handleTransfer()}
                >
                  Transfer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
