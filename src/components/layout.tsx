import type { PropsWithChildren } from "react";
import { Nav } from "./navigation";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex flex-col items-center justify-center gap-8 overflow-x-auto w-2xl">
      <Nav />
      {props.children}
    </main>
  );
};
