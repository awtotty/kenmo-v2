import Head from "next/head";
import Link from "next/link";
import { ClassCard } from "~/components/classCard";
import { PageLayout } from "~/components/layout";
import { type RouterOutputs, api } from "~/utils/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

type Enrollment = RouterOutputs["enrollment"]["getAllCurrentUser"][0];

// a new component to show the user's enrollments
const Enrollments = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: enrollments, isLoading, error, refetch } =
    api.enrollment.getAllCurrentUser.useQuery(undefined, {
      enabled: isLoaded && isSignedIn === true,
    });

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Please sign in to view your classes.</div>;
  if (isLoading) return <div>Loading...</div>;
  if (error) return (
    <div role="alert" className="flex flex-col items-center gap-3">
      <p>We couldn’t load your classes. Please try again.</p>
      <Button onClick={() => { void refetch(); }}>Retry</Button>
    </div>
  );

  if (!enrollments || enrollments.length == 0)
    return (
        <div className="flex justify-center">
          <Link href="/join">
            <Button>
              Join a class
            </Button>
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
