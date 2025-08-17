import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";
import { ROLE } from "~/utils/constants";
import { formatBalance } from "~/utils/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      <div className="w-full max-w-6xl mx-auto">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <Link href={`/class/${enrollment.classCode}/manage`} className="block">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="font-semibold text-lg">{enrollment.className}</div>
                  <div className="text-sm text-muted-foreground">{enrollment.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Class Code: {enrollment.classCode}</div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  } else if (enrollment.role === ROLE.STUDENT) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <Link href={`/class/${enrollment.classCode}/transfer`} className="block">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="font-semibold text-lg">{enrollment.className}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-muted-foreground">
                    Balance: {formatBalance(enrollment.checkingAccountBalance)}
                  </div>
                  <Button size="sm">
                    Send
                  </Button>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
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
