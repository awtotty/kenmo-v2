// TODO: Make nav bar show active page
// see https://stackoverflow.com/questions/70342961/nextjs-react-tailwind-css-navbar-active-styling

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const navButtonStyle = "hover:text-muted-foreground transition-colors";

export const Nav = () => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex items-center space-x-6">
              <Link href="/">
                <Image src="/logo/svg/logo-no-background.svg" alt="Kenmo" width={80} height={80} />
              </Link>
              <nav className="flex space-x-6">
                <Link className={navButtonStyle} href="/">
                  Home
                </Link>
                <Link className={navButtonStyle} href="/join">
                  Join
                </Link>
                <Link className={navButtonStyle} href="/settings">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex-grow"></div>
            <div className="flex justify-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
