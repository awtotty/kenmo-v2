import { UserButton } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import router, { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";

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

      <PageLayout>
        <p> Class code: {router.query.classCode}</p>
        Withdraw page
      </PageLayout >
    </>
  );
}
