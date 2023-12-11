// TODO: Make nav bar show active page
// see https://stackoverflow.com/questions/70342961/nextjs-react-tailwind-css-navbar-active-styling 

import { UserButton } from "@clerk/nextjs"

export const Nav = () => {
  return (
    <>
      <div className="flex items-center border w-full md:max-w-2xl p-4">
        <ul className="flex">
          <li className="mr-6">
            <a className="text-blue-500 hover:text-blue-800" href="/">Home</a>
          </li>
          <li className="mr-6">
            <a className="text-gray-400 cursor-not-allowed" href="#">Shop</a>
          </li>
        </ul>
        <div className="flex-grow"></div>
        <div className="flex float-right justify-center">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </>
  )
}