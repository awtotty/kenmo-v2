import Head from "next/head";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api, type RouterOutputs } from "~/utils/api";
import { formatBalance } from "~/utils/helpers";
import { TrashIcon } from "@heroicons/react/20/solid";
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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CustomTransaction = RouterOutputs["transaction"]["getCustomTransactions"][0];

const CustomTransactionList = () => {
  const apiUtils = api.useUtils();
  const { data, isLoading } = api.transaction.getCustomTransactions.useQuery();
  const { mutateAsync: deleteAsync, isLoading: deleteIsLoading } = api.transaction.deleteCustomTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transaction deleted successfully");
      void apiUtils.transaction.getCustomTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(`Unable to delete transaction: ${error.message}`);
    }
  })
  if (isLoading) {
    return (
      <>
        <div className="flex flex-col w-full items-center md:max-w-2xl">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Your Custom Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <div className="flex flex-col w-full items-center md:max-w-2xl">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Your Custom Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{`You don't have any saved transactions.`}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col w-full items-center md:max-w-2xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Your Custom Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Amount</TableHead>
                  <TableHead className="w-3/4">Note</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((transaction: CustomTransaction) => {
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {formatBalance(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {transaction.note}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (!confirm("Are you sure you want to delete this transaction?")) {
                              return;
                            }
                            void deleteAsync(transaction.id);
                          }}
                          disabled={deleteIsLoading}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div >
    </>
  );
}

const CustomTransactionCreator = () => {
  const apiUtils = api.useUtils();
  const [amount, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { mutateAsync, isLoading } = api.transaction.createCustomTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transaction created successfully");
      void apiUtils.transaction.getCustomTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(`Unable to save transaction: ${error.message}`);
    }
  });
  return (
    <>
      <div className="flex flex-col w-full items-center md:max-w-2xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Custom Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!amount) {
                  toast.error("Amount is required");
                  return;
                }
                void mutateAsync({
                  amount: parseFloat(amount),
                  note: note,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="text"
                    id="amount"
                    value={amount ?? ""}
                    placeholder="0.00"
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input
                  type="text"
                  id="note"
                  value={note}
                  placeholder="Note"
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div className="space-y-6">
          <CustomTransactionCreator />
          <CustomTransactionList />
        </div>
      </PageLayout>
    </>
  );
}
