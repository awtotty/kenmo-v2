import { UserButton } from "@clerk/nextjs";
import { Enrollment } from "@prisma/client";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { api } from "~/utils/api";


const ClassCards = () => {
  const { data: enrollments, isLoading } = api.enrollment.getAll.useQuery();

  if (isLoading) return <div>Loading...</div>;

  if (!enrollments || enrollments.length == 0) return <div>No enrollments found. TODO: Add a class sign up</div>;

  return (
    <>
      <div className="flex flex-col justify-center w-full md: max-w-2xl items-center">
        {enrollments?.map((enrollment) => (
          <div className="items-center w-full md:max-w-2xl" key={enrollment.id}>
            {/* main card body */}
            <div className="flex items-center border w-full md:max-w-2xl p-4">
              <div className="float-left">
                {enrollment.className}
              </div>
              <div className="flex-grow"></div>
              <div className="float-right">
                <div className="text-right">
                  Bank Balance: ${enrollment.bankBalance}
                </div>
                <Link href="/withdraw">
                  <button
                    className="bg-slate-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >Withdraw</button>
                </Link>
                <Link className="float-right" href="/deposit">
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >Deposit</button>
                </Link>
              </div>
            </div>
            {/* recent transactions list */}
            <div className="flex items-center md:max-w-xl p-2 w-10/12 border-x border-b">
              <div>
                Recent transactions go here
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const CreateClass = () => {
  return (
    <>
    </>
  )
}

const CashCard = () => {
  const cash = api.cash.get.useQuery();

  if (cash.isLoading) return <div>Loading...</div>;

  return (
    <>
      <div className="flex items-center border w-full md:max-w-2xl p-4">
        <div className="flex float-left justify-center items-center">
          <UserButton afterSignOutUrl="/" />
          <div className="p-2"></div>
          <div className="text-left">
            Hi {cash.data?.name ?? "there"}!
          </div>
        </div>
        <div className="flex-grow"></div>
        <div className="float-right text-right">
          <div>
            Your Ken Kash wallet: ${cash.data?.amount}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Home() {
  const [input, setInput] = useState("");

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-col justify-center items-center gap-4">

        <CashCard />

        <ClassCards />
      </main >
    </>
  );
}
