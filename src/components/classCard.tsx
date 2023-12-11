import Link from "next/link";
import { RouterOutputs } from "~/utils/api";

type EnrollmentWithClassInfo = RouterOutputs["enrollment"]["getAll"][0];
export const ClassCard = ({ enrollment, numTransactions=5 }: { enrollment: EnrollmentWithClassInfo, numTransactions: number }) => {
    return (
        <>
            <div className="items-center w-full md:max-w-2xl" key={enrollment.id}>
                {/* main card body */}
                <a href={`/class/${enrollment.classCode}`}>
                    <div className="flex items-center border w-full md:max-w-2xl p-4">
                        <div className="float-left">
                            {enrollment.className}
                        </div>
                        <div className="flex-grow"></div>
                        <div className="float-right">
                            <div className="text-right">
                                Bank Balance: ${enrollment.bankBalance}
                            </div>
                            <Link href={`/class/${enrollment.classCode}/withdraw`}>
                                <button
                                    className="bg-slate-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                >Withdraw</button>
                            </Link>
                            <Link className="float-right" href={`/class/${enrollment.classCode}/deposit`}>
                                <button
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                >Deposit</button>
                            </Link>
                        </div>
                    </div>
                </a>
                {/* recent transactions list */}
                <div className="flex items-center md:max-w-xl p-2 w-10/12 border-x border-b">
                    <div>
                        Recent transactions go here.
                        Showing max {numTransactions} transactions
                    </div>
                </div>
            </div>
        </>
    )
}
