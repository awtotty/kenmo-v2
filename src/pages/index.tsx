import Head from "next/head";
import Link from "next/link";
import { ClassCard } from "~/components/classCard";
import { PageLayout } from "~/components/layout";
import { type RouterOutputs, api } from "~/utils/api";

type Enrollment = RouterOutputs["enrollment"]["getAllCurrentUser"][0];

// a new component to show the user's enrollments
const Enrollments = () => {
  const { data: enrollments, isLoading } =
    api.enrollment.getAllCurrentUser.useQuery();

  if (isLoading) return <div>Loading...</div>;

  if (!enrollments || enrollments.length == 0)
    return (
        <div>
          <Link href="/join">
            <button className="bg-blue-500 hover:bg-blue-600 py-2 px-4 rounded">
              Join a class
            </button>
          </Link>
        </div>
    );

  return (
    <>
      <div className="md: flex w-full max-w-6xl mx-auto flex-col items-center justify-center gap-4">
        {enrollments?.map((enrollment: Enrollment) => (
          <ClassCard
            enrollment={enrollment}
            key={enrollment.id}
          />
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
        <Enrollments />
      </PageLayout>
    </>
  );
}
