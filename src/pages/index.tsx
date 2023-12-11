import Head from "next/head";
import { CashCard } from "~/components/cashCard";
import { ClassCard } from "~/components/classCard";
import { PageLayout } from "~/components/layout";
import { Nav } from "~/components/navigation";
import { api } from "~/utils/api";

const AccountFeed = () => {
  const { data: enrollments, isLoading } = api.enrollment.getAll.useQuery();

  if (isLoading) return <div>Loading...</div>;

  if (!enrollments || enrollments.length == 0) return <div>No enrollments found. TODO: Add a class sign up</div>;

  return (
    <>
      <div className="flex flex-col justify-center w-full md: max-w-2xl items-center gap-4">
        {enrollments?.map((enrollment) => (
          <ClassCard enrollment={enrollment} numTransactions={5} />
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

export default function Home() {
  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <CashCard />
        <AccountFeed />
      </PageLayout>
    </>
  );
}
