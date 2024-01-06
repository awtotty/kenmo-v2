import Head from "next/head";
import { useRouter } from "next/router";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";

export default function ClassPage() {
  const router = useRouter()

  const classCode = router.query.classCode;
  if (!classCode) return <div>Loading...</div>;
  if (typeof classCode !== "string") return <div>Invalid class code</div>;

  const { data: enrollments, isLoading } = api.enrollment.getAllByClassCode.useQuery({ classCode });
  if (isLoading) return <div>Loading...</div>;
  if (!enrollments || enrollments.length == 0) return <div>No enrollments found.</div>;

  return (
    <>
      <Head>
        <title>Kenmo</title>
        <meta name="description" content="Digital Ken Kash" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        {/* list all enrollments */}
        <div className="flex flex-col">
          {enrollments?.map((enrollment) => (
            <div
              className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2"
              key={enrollment.id}
            >
              <div>
                {enrollment.firstName} {enrollment.lastName}
              </div>
              <div>
                {enrollment.email}
              </div>
              <div>
                {enrollment.role}
              </div>
            </div>
          ))}
        </div>

        Class page for class code: {classCode}

      </PageLayout>
    </>
  );
}
