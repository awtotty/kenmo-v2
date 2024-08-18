// TODO: Make nav bar show active page
// see https://stackoverflow.com/questions/70342961/nextjs-react-tailwind-css-navbar-active-styling

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const Nav = () => {
  return (
    <>
      <div className="flex w-full items-center border p-4 md:max-w-2xl">
        <ul className="flex">
          <li className="mr-6">
            <Link className="text-blue-500 hover:text-blue-800" href="/">
              Home
            </Link>
          </li>
          <li className="mr-6">
            <Link className="cursor-not-allowed text-gray-400" href="#">
              Activity
            </Link>
          </li>
          <li className="mr-6">
            <Link className="text-blue-500 hover:text-blue-800" href="/join">
              Join
            </Link>
          </li>
        </ul>
        <div className="flex-grow"></div>
        <div className="float-right flex justify-center">
          <div className="flex justify-center p-1">
            <Link className="text-blue-500 hover:text-blue-800" href="/settings">
              Settings
            </Link>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </>
  );
};
