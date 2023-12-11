import type { PropsWithChildren } from "react";
import { Nav } from "./navigation";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex flex-col justify-center items-center gap-8">
      <Nav />
      {props.children}
    </main>
  )
};