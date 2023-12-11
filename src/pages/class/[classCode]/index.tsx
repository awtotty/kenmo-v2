import { UserButton } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import router, { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { CashCard } from "~/components/cashCard";
import { ClassCard } from "~/components/classCard";
import { PageLayout } from "~/components/layout";

import { api } from "~/utils/api";


export default function ClassPage() {
  const router = useRouter()

  const classCode = router.query.classCode;
  if (!classCode) return <div>Loading...</div>;
  if (typeof classCode !== "string") return <div>Invalid class code</div>;

  const { data: enrollment, isLoading } = api.enrollment.getByClassCode.useQuery({ classCode });
  if (isLoading) return <div>Loading...</div>;
  if (!enrollment || enrollment.length == 0) return <div>No enrollment found. </div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <CashCard />
        <ClassCard enrollment={enrollment[0]!} numTransactions={1000} />
      </PageLayout>
    </>
  );
}
