import { create } from "domain";
import Head from "next/head";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";


const TransactionFeed = (prop: { classCode: string }) => {
  const { data: transactions, isLoading } = api.transaction.getAllByClassCode.useQuery(prop.classCode);

  if (isLoading) return <div>Loading...</div>;

  if (!transactions || transactions.length == 0) return <div>No transactions found.</div>;

  return (
    <>
          <div className="flex flex-col text-center gap-4 border-b-2 border-gray-200 my-2">
        Recent Transactions
      </div>
      <div className="flex flex-col justify-center w-full md: max-w-2xl items-center gap-4">
        {transactions?.map((transaction) => (
          <div
            key={transaction.id}
            className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2"
          >
            <div>
              ${transaction.amount}
            </div>
            <div>
              {transaction.fromAccountId} {"=>"} {transaction.toAccountId}
            </div>
            <div>
              {transaction.createdAt.toTimeString()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ClassPage() {
  const apiUtils = api.useUtils();
  const router = useRouter()
  const classCode = router.query.classCode;
  const { mutateAsync: deleteEnrollment, isLoading: deleteIsLoading } = api.enrollment.delete.useMutation({
    onSuccess: () => {
      toast.success("Enrollment deleted");
      apiUtils.enrollment.getAllByClassCode.invalidate();
    },
    onError: (error) => {
      toast.error("Could not delete enrollment");
    }
  });
  const { mutateAsync: createTransaction, isLoading: createIsLoading } = api.transaction.create.useMutation({
    onSuccess: () => {
      toast.success("Transaction created");
      apiUtils.enrollment.getAllByClassCode.invalidate();
      apiUtils.transaction.getAllByClassCode.invalidate();
    },
    onError: (error) => {
      toast.error("Could not create transaction");
    }
  });
  const { mutateAsync: deleteClass, isLoading: deleteClassIsLoading } = api.class.delete.useMutation({
    onSuccess: () => {
      toast.success("Class deleted");
      router.push("/");
    },
    onError: (error) => {
      toast.error("Could not delete class");
    }
  });

  if (!classCode) return <div>Loading...</div>;
  if (typeof classCode !== "string") return <div>Invalid class code</div>;
  const userAccounts = api.account.getAllByClassCode.useQuery({ classCode });
  const classInfo = api.class.getByClassCode.useQuery({ classCode });
  const { data: enrollments, isLoading } = api.enrollment.getAllByClassCode.useQuery({ classCode });
  if (isLoading) return <div>Loading...</div>;
  if (!enrollments || enrollments.length == 0) return <div>No enrollments found.</div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div>
          {classInfo.data?.className}
        </div>
        <div>
          Class code: {classCode}
        </div>
        {/* list all enrollments */}
        <div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            <div>
              Amount
            </div>
            <div>
              Transfer
            </div>
            <div>
              Name
            </div>
            <div>
              Email
            </div>
            <div>
              Role
            </div>
            <div>
              Checking
            </div>
            <div>
              Investment
            </div>
            <div>
              Remove
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          {enrollments?.map((enrollment) => (
            <div
              className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2"
              key={enrollment.id}
            >
              <div>
                <select
                  className="bg-white border border-gray-400 rounded px-2 py-1 text-gray-700"
                  name="amount"
                  id={`amount-${enrollment.id}`}
                  defaultValue={5}
                >
                  <option value="-20">-$20</option>
                  <option value="-10">-$10</option>
                  <option value="-5">-$5</option>
                  <option value="5">$5</option>
                  <option value="10">$10</option>
                  <option value="20">$20</option>
                </select>
              </div>
              <div>
                <button
                  className="bg-blue-400 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                  disabled={createIsLoading}
                  onClick={() => {
                    // use the value of the select to create a transaction
                    createTransaction({
                      amount: parseInt((document.getElementById(`amount-${enrollment.id}`) as HTMLSelectElement).value),
                      fromAccountId: userAccounts.data?.[0]?.id ?? -1,
                      toAccountId: enrollment.checkingAccountId ?? -1,
                    })
                  }}
                >
                  Transfer
                </button>
              </div>
              <div>
                {enrollment.firstName} {enrollment.lastName}
              </div>
              <div>
                {enrollment.email}
              </div>
              <div>
                {enrollment.role}
              </div>
              <div>
                {enrollment.checkingAccountBalance || enrollment.checkingAccountBalance == 0 ? `$${enrollment.checkingAccountBalance}` : "-"}
              </div>
              <div>
                {enrollment.investmentAccountBalance || enrollment.investmentAccountBalance == 0 ? `$${enrollment.investmentAccountBalance}` : "-"}
              </div>
              <div>
                <button
                  className="bg-red-400 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                  disabled={deleteIsLoading}
                  onClick={() => {
                    deleteEnrollment({ id: enrollment.id })
                  }}
                >Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <TransactionFeed classCode={classCode} />
        </div>

        <div>
          <button
            className="bg-red-400 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            disabled={deleteClassIsLoading}
            onClick={() => {
              deleteClass({ classCode })
            }}
          >Delete Class</button>
        </div>
      </PageLayout>
    </>
  );
}
