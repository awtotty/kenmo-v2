// TODO: Make nav bar show active page
// see https://stackoverflow.com/questions/70342961/nextjs-react-tailwind-css-navbar-active-styling

import { UserButton } from "@clerk/nextjs";

export const Nav = () => {
  return (
    <>
      <div className="flex w-full items-center border p-4 md:max-w-2xl">
        <ul className="flex">
          <li className="mr-6">
            <a className="text-blue-500 hover:text-blue-800" href="/">
              Home
            </a>
          </li>
          <li className="mr-6">
            <a className="cursor-not-allowed text-gray-400" href="#">
              Activity
            </a>
          </li>
          <li className="mr-6">
            <a className="text-blue-500 hover:text-blue-800" href="/join">
              Join
            </a>
          </li>
        </ul>
        <div className="flex-grow"></div>
        <div className="float-right flex justify-center">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </>
  );
};
