'use client'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";
import Image from "next/image"
import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import MonoConnectButton from "./MonoConnwctButton";

const MobileNav = ({user}: MobileNavProps) => {

  const pathName = usePathname();
  return (
    <section className="w-full max-w-[264px]">
        <Sheet>
            <SheetTrigger>
                <Image 
                    src="/icons/hamburger.svg"
                    width={30}
                    height={30}
                    alt="menu"
                    className="cursor-pointer"
                />
            </SheetTrigger>
            <SheetContent className="bg-white border-none" side='left'>
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <Link href='/' className='cursor-pointer flex items-center gap-1 px-4'>
                    <Image
                        src='/icons/logo.svg'
                        alt='Kleva logo'
                        width={34}
                        height={34}
                    />
                    <h1 className='text-26 font-ibm-plex-serif font-bold text-black-1'>Kleva</h1>
                </Link>
                <div className="mobile-nav-sheet">
                    <SheetClose asChild>
                        <nav className="flex h-full flex-col gap-6 pt-16 text-white">
                            {sidebarLinks.map((link) => {
                                const isActive = pathName === link.route || pathName.startsWith(`${link.route}/`);
                                return (
                                    <SheetClose key={link.route} asChild>
                                        <Link className={cn('mobilenav-sheet_close w-full', {'bg-bankGradient': isActive})} href={link.route} key={link.label}>       
                                            <Image
                                            src={link.imgURL}
                                            alt={link.label}
                                            width={20}
                                            height={20}
                                            className={cn({'brightness-[3] invert-0': isActive})}
                                            />
                                            <p className={cn('text-16 font-semibold text-black-2', {'text-white': isActive})}>{link.label}</p>
                                        </Link>
                                        </SheetClose>
                                )
                            })}
                            <MonoConnectButton user={user}/>
                        </nav>
                    </SheetClose>
                    <Footer user={user} type='mobile'/>
                </div>  
            </SheetContent>
        </Sheet>
    </section>
  )
}

export default MobileNav