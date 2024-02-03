import Head from "next/head";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { api } from "~/utils/api";


export default function ClassPage() {
  const apiUtils = api.useUtils();
  const router = useRouter()
  const classCode = router.query.classCode;
  const { mutateAsync: deleteEnrollment, isLoading: deleteIsLoading } = api.enrollment.delete.useMutation({
    onSuccess: () => {
      toast.success("Enrollment deleted");
      apiUtils.enrollment.getAllByClassCode.invalidate();
    },
    onError: (error) => {
      toast.error("Could not delete enrollment");
    }
  });

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
        <div>
          Class code: {classCode}
        </div>
        {/* list all enrollments */}
        <div>
          <div className="flex flex-row justify-between gap-4 border-b-2 border-gray-200 py-2">
            <div>
              Name
            </div>
            <div>
              Email
            </div>
            <div>
              Role
            </div>
            <div>
              Checking
            </div>
            <div>
              Investment
            </div>
            <div>
              Actions
            </div>
          </div>
        </div>
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
              <div>
                {enrollment.checkingAccountBalance || enrollment.checkingAccountBalance == 0 ? `$${enrollment.checkingAccountBalance}` : "-"}
              </div>
              <div>
                {enrollment.investmentAccountBalance || enrollment.investmentAccountBalance == 0 ? `$${enrollment.investmentAccountBalance}` : "-"}
              </div>
              <div>
                <button
                  className="bg-slate-400 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                  disabled={deleteIsLoading}
                  onClick={() => {
                    deleteEnrollment({ id: enrollment.id })
                  }}
                >Remove</button>
              </div>
            </div>
          ))}
        </div>

      </PageLayout>
    </>
  );
}
