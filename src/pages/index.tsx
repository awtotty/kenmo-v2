import Head from "next/head";
import { useState } from "react";
import toast from "react-hot-toast";
import { ClassCard } from "~/components/classCard";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";

const AccountFeed = () => {
  const { data: enrollments, isLoading } = api.enrollment.getAllCurrentUser.useQuery();

  if (isLoading) return <div>Loading...</div>;

  if (!enrollments || enrollments.length == 0) return <div>No enrollments found.</div>;

  return (
    <>
      <div className="flex flex-col justify-center w-full md: max-w-2xl items-center gap-4">
        {enrollments?.map((enrollment) => (
          <ClassCard enrollment={enrollment} numTransactions={5} key={enrollment.id} />
        ))}
      </div>
    </>
  );
}

// const InterestTestButton = () => {
//   const { mutateAsync: interestTest, isLoading } = api.transaction.testInterest.useMutation({
//     onSuccess(data, variables, context) {
//       toast.success(`Interest test successful!`)
//     }
//   });
//   return (
//     <>
//       <div>
//         <button
//           onClick={() => {
//             interestTest();
//           }}
//         >
//           Interest Test
//         </button>
//       </div >
//     </>
//   );
// };

export default function Home() {
  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <AccountFeed />
        {/* <InterestTestButton /> */}
      </PageLayout>
    </>
  );
}
