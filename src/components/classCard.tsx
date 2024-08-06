import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { RouterOutputs, api } from "~/utils/api";
import { ROLE } from "~/utils/constants";

type EnrollmentWithClassInfo =
  RouterOutputs["enrollment"]["getAllCurrentUser"][0];
export const ClassCard = ({
  enrollment,
}: {
  enrollment: EnrollmentWithClassInfo;
}) => {
  const userId = useUser().user?.id;
  if (!userId) return <div>Not logged in</div>;
  if (!enrollment) return <div>Invalid enrollment</div>;

  if (enrollment.role === ROLE.ADMIN) {
    return (
      <>

        <Link href={`/class/${enrollment.classCode}/manage`} className="block w-full md:max-w-2xl p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">

          <div className="float-left flex-col">
            <div className="text-left">{enrollment.className}</div>
            <div className="text-left">{enrollment.role}</div>
          </div>
          <div className="flex-grow"></div>
          <div className="float-right">
            <div>Class Code: {enrollment.classCode}</div>
          </div>
        </Link>
      </>
    );
  } else if (enrollment.role === ROLE.STUDENT) {
    return (
      <>
        <Link href={`/class/${enrollment.classCode}/transfer`} className="block w-full md:max-w-2xl p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">

          <div className="float-left flex-col">
            <div className="text-left">{enrollment.className}</div>
          </div>
          <div className="flex-grow"></div>
          <div className="float-right">
            <div>
              Checking:{" "}
              {enrollment.checkingAccountBalance ||
                enrollment.checkingAccountBalance == 0
                ? `$${enrollment.checkingAccountBalance}`
                : "-"}
            </div>
            <div>
              Investment:{" "}
              {enrollment.investmentAccountBalance ||
                enrollment.investmentAccountBalance == 0
                ? `$${enrollment.investmentAccountBalance}`
                : "-"}
            </div>
          </div>
        </Link>
      </>
    );
  } else {
    return <div>Invalid role</div>;
  }

  // const transactions = api.transaction.getManyByClassCode.useQuery({ userId: userId, classCode: enrollment.classCode }).data;

  {
    /* recent transactions list */
  }
  {
    /* <div className="flex flex-col items-center md:max-w-xl p-2 w-10/12 border-x border-b">
          <div className="flex items-center w-full flex-col">
            <div className="float-left"></div>
            <div className="flex-grow"></div>
            <div className="float-right text-right">
              <a href={`/class/${enrollment.classCode}`}>
                <button className="flex bg-slate-500 hover:bg-blue-700 text-white py-0 px-2 rounded">
                  See all
                </button>
              </a>
            </div>
            <div className="flex-col">
              <div>
                Transcactions? 
                {(transactions && transactions.length > 0) ?
                  transactions?.map((transaction) =>
                    <div className="flex flex-row w-full" key={transaction.id}>
                      <div className="float-left">
                        {transaction.note}
                      </div>
                      <div className="flex-grow"></div>
                      <div className="float-right">
                        ${transaction.amount}
                      </div>
                    </div>
                  ) : <div>No recent transactions</div>
                }
              </div>
            </div>
          </div>
        </div> */
  }
};
