import { UserButton } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";

import { api } from "~/utils/api";

export default function Home() {
  const cash = api.cash.get.useQuery();

  if (cash.isLoading) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex justify-center items-center border-t border-b">
        <UserButton afterSignOutUrl="/" />
        <div>
          Hi {cash.data?.name ?? "there"}. Your cash is ${cash.data?.amount}.
        </div>
      </main>
    </>
  );
}
