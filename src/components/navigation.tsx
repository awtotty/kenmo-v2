// TODO: Make nav bar show active page
// see https://stackoverflow.com/questions/70342961/nextjs-react-tailwind-css-navbar-active-styling

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

const navButtonStyle = "hover:text-slate-500";

export const Nav = () => {
  return (
    <>
      <div className="flex w-full items-center border border-blue-900 rounded p-4 md:max-w-2xl">
        <ul className="flex">
          <li className="mr-6">
            <Link className="" href="/">
              <Image src="/logo/svg/logo-no-background.svg" alt="Kenmo" width={80} height={80} />
            </Link>
          </li>
          <li className="mr-6">
            <Link className={navButtonStyle} href="/">
              Home
            </Link>
          </li>
          {/*
          <li className="mr-6">
            <Link className={navButtonStyle} href="#">
              Activity
            </Link>
          </li>
          */}
          <li className="mr-6">
            <Link className={navButtonStyle} href="/join">
              Join
            </Link>
          </li>
          <div className="mr-6">
            <Link className={navButtonStyle} href="/settings">
              {`Settings `}
            </Link>
          </div>
        </ul>
        <div className="flex-grow"></div>
        <div className="float-right flex justify-center">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </>
  );
};
