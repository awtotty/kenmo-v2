// TODO: Make nav bar show active page
// see https://stackoverflow.com/questions/70342961/nextjs-react-tailwind-css-navbar-active-styling

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "~/contexts/ThemeContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

const navButtonStyle = "hover:text-muted-foreground transition-colors";

export const Nav = () => {
  const { theme, toggleTheme } = useTheme();

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
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
