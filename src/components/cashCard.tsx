import { api } from "~/utils/api";

export const CashCard = () => {
    const cash = api.cash.get.useQuery();
  
    if (cash.isLoading) return <div>Loading...</div>;
  
    return (
      <>
        <div className="flex items-center border w-full md:max-w-2xl p-4">
          <div className="flex float-left justify-center items-center">
            <div className="text-left">
              Hi {cash.data?.name ?? "there"}!
            </div>
          </div>
          <div className="flex-grow"></div>
          <div className="float-right text-right">
            <div>
              Your Ken Kash wallet: ${cash.data?.amount}
            </div>
          </div>
        </div>
      </>
    )
  }