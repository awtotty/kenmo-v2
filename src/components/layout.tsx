import type { PropsWithChildren } from "react";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex flex-col justify-center items-center gap-4">
      {props.children}
    </main>
  )
};