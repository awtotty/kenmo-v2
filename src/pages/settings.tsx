import Head from "next/head";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api, type RouterOutputs } from "~/utils/api";
import { TrashIcon } from "@heroicons/react/20/solid";

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
        <div className="text-xl font-bold">Your Custom Transactions</div>
        <div>Loading...</div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <div className="text-xl font-bold">Your Custom Transactions</div>
        <div>{`You don't have any saved transactions.`}</div>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col w-full items-center md:max-w-2xl">
        <div>Your Custom Transactions</div>
        <table className="md:min-w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="w-1/4 border border-gray-300 bg-gray-700 p-2">Amount</th>
              <th className="w-3/4 border border-gray-300 bg-gray-700 p-2">Note</th>
              <th className="min-w-[50px] border border-gray-300 bg-gray-700 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((transaction: CustomTransaction) => {
              return (
                <tr
                  key={transaction.id}
                >
                  <td
                    className="w-1/8 border border-gray-300 p-2"
                  >
                    {transaction.amount}
                  </td>
                  <td
                    className="w-1/8 border border-gray-300 p-2"
                  >
                    {transaction.note}
                  </td>
                  <td
                    className="w-1/8 border border-gray-300 p-2"
                  >
                    <button
                      className="bg-red-400 hover:bg-red-500 p-2 rounded justify-center"
                      onClick={() => {
                        if (!confirm("Are you sure you want to delete this transaction?")) {
                          return;
                        }
                        void deleteAsync(transaction.id);
                      }}
                      disabled={deleteIsLoading}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table >
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
      <div className="flex flex-col w-full items-center border border-blue-900 rounded p-4 md:max-w-2xl">
        <div>Create Custom Transaction</div>
        <div className="flex flex-row w-justify-between gap-4 py-2">
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
          >
            <div className="flex flow-root p-2">
              <label className="flex w-1/2 float-left justify-between py-2" htmlFor="amount">Amount</label>
              <span className="absolute -mr-10">$</span>
              <input
                className="flex float-right w-1/2 border border-gray-300 rounded-md p-2 text-slate-700"
                type="text"
                id="amount"
                value={amount ?? undefined}
                placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flow-root p-2">
              <label className="flex w-1/2 float-left justify-between py-2" htmlFor="note">Note</label>
              <input
                className="flex float-right w-1/2 border border-gray-300 rounded-md p-2 text-slate-700"
                type="text"
                id="note"
                value={note}
                placeholder="Note"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex flex-center justify-center">
              <button
                className="bg-blue-500 text-white p-2 rounded-md"
                type="submit"
                disabled={isLoading}
              >
                Save
              </button>
            </div>
          </form>
        </div>
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
        <CustomTransactionCreator />
        <CustomTransactionList />
      </PageLayout>
    </>
  );
}
