import Head from "next/head";
import { useRouter } from "next/router";
import { parse } from "path";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { RouterOutputs, api } from "~/utils/api";


type Account = RouterOutputs["account"]["getAllByClassCode"][0];

export default function ClassPage() {
  const router = useRouter()

  // tRPC hook for state invalidation and other things
  const apiUtils = api.useUtils();

  const classCode = router.query.classCode;
  if (!classCode) return <div>Loading...</div>;
  if (typeof classCode !== "string") return <div>Invalid class code</div>;

  // input field for class code
  const [fromItems, setFromItems] = useState<Account[]>([]);
  const [toItems, setToItems] = useState<Account[]>([]);
  const [fromSelectedItem, setFromSelectedItem] = useState("");
  const [toSelectedItem, setToSelectedItem] = useState("");
  const [amountInput, setAmountInput] = useState("0.00");

  // query the accounts with this class code and set the fromItems and toItems
  const { data: accounts, isLoading: accountsLoading } = api.account.getAllByClassCode.useQuery({ classCode });
  useEffect(() => {
    if (accounts) {
      setFromItems(accounts);
      setToItems(accounts);
    }
  }, [accounts]);


  const { mutateAsync: createTransaction, isLoading } = api.transaction.create.useMutation({
    onSuccess: async (output) => {
      toast.success(`Transaction complete`)
    },
    onError: (error) => {
      toast.error(`Transaction failed. Try again later.`)
    }
  })

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div>
          Class code: {classCode}
        </div>

        <div className="flex-col">
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            From account:
            <select
              className="border-2 border-gray-200 rounded text-gray-700"
              value={fromSelectedItem}
              onChange={(e) => setFromSelectedItem(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an account</option>
              {fromItems.map((item) => (
                <option key={item.id} value={item.id}>{`${item.id} ($${item.balance})`}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            To account:
            <select
              className="border-2 border-gray-200 rounded text-gray-700"
              value={toSelectedItem}
              onChange={(e) => setToSelectedItem(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an account</option>
              {toItems.map((item) => (
                <option key={item.id} value={item.id}>{`${item.id} ($${item.balance})`}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            Amount:
            <input
              className="border-2 border-gray-200 rounded text-gray-700"
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row justify-between gap-4 border-gray-200 py-2">
            <button
              className="bg-slate-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={isLoading}
              onClick={async () => {
                try {
                  await createTransaction({ fromAccountId: parseInt(fromSelectedItem, 10), toAccountId: parseInt(toSelectedItem, 10), amount: parseFloat(amountInput) });
                  apiUtils.account.getAllByClassCode.invalidate({ classCode });
                  setAmountInput("0.00");
                } catch (e) {
                }
              }}>Create</button>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
