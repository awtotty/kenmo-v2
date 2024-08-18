import Head from "next/head";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api, type RouterOutputs } from "~/utils/api";

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
    <div className="space-y-4">
      <div className="text-xl font-bold">Your Custom Transactions</div>
      {isLoading && <div>Loading...</div>}
      {data?.map((transaction: CustomTransaction) => (
        <div key={transaction.id} className="flex space-x-4">
          <div>{transaction.amount}</div>
          <div>{transaction.note}</div>
          <button
            className="bg-red-500 text-white p-2 rounded-md"
            onClick={() => void deleteAsync(transaction.id)}
            disabled={deleteIsLoading}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

const CustomTransactionCreator = () => {
  const apiUtils = api.useUtils();
  const [amount, setAmount] = useState(0.0);
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
    <div className="space-y-4 flex flex-col justify-center">
      <div className="text-xl font-bold">Create Custom Transaction</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void mutateAsync({
            amount: amount,
            note: note,
          });
        }}
      >
        <div className="space-y-2 flex">
          <label className="p-4" htmlFor="amount">Amount</label>
          <input
            className="w-1/2 border-2 border-gray-300 rounded-md p-2 text-slate-700"
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="p-4" htmlFor="note">Note</label>
          <input
            className="w-1/2 border-2 border-gray-300 rounded-md p-2 text-slate-700"
            type="text"
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div>
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
