import { UserButton } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import router, { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";

import { api } from "~/utils/api";


export default function ClassPage() {
  const router = useRouter()  

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-col justify-center items-center">
        <p>Class code: {router.query.classCode}</p>
        Deposit page
      </main >
    </>
  );
}
