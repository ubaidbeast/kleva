'use client'
import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import Footer from './Footer'

const Sidebar = ({user} : SidebarProps) => {
  const pathName = usePathname();
  return (
    <section className='sidebar'>
      <nav className='flex flex-col gap-4'>
        <Link href='/' className='mb-12 cursor-pointer flex items-center gap-2'>
          <Image
            src='/icons/logo.svg'
            alt='Kleva logo'
            width={34}
            height={34}
            className='size-[24px] max-xl:size-14'
          />
          <h1 className='sidebar-logo'>Kleva</h1>
        </Link>
        {sidebarLinks.map((link) => {
          const isActive = pathName === link.route || pathName.startsWith(`${link.route}/`);
          return (
            <Link className={cn('sidebar-link', {'bg-bankGradient': isActive})} href={link.route} key={link.label}>
              <div className='relative size-6'>
                <Image
                  src={link.imgURL}
                  alt={link.label}
                  fill
                  className={cn({'brightness-[3] invert-0': isActive})}
                />
              </div>
              <p className={cn('sidebar-label', {'!text-white': isActive})}>{link.label}</p>
            </Link>
          )
        })}
        USER
      </nav>
      <Footer user={user}/>
    </section>
  )
}

export default Sidebar