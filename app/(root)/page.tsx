
import HeaderBox from '@/components/HeaderBox'
import MonoConnectButton from '@/components/MonoConnwctButton'
import RecentTransactions from '@/components/RecentTransactions'
import RightSidebar from '@/components/RightSidebar'
import TotalBlanceBox from '@/components/TotalBlanceBox'
import { getAccount, getAccounts } from '@/lib/actions/bank.actions'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const Home = async ({searchParams: {id, page}}: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ userId: loggedIn?.$id!});

   if(!accounts) return;

  const accountsData = accounts?.data;  
  
  const appwriteItemId = (id as string) || accounts?.data[0].appwriteItemId;
  console.log('appwriteitem',appwriteItemId);
   const account = await getAccount({ appwriteItemId })
  console.log("accounts", accounts);
  console.log("account", account);

  return accounts.totalBanks > 1 ?(
    <section className='home'>
      <div className="home-content">
        <header className='home-header'>
          <HeaderBox 
          type="greeting"
          title="Welcome"
          user={loggedIn?.firstName || "Guest"}
          subtext="access and manage your account and transactions efficiently"
          />
          <TotalBlanceBox 
          accounts={accountsData}
          totalBanks={accounts?.totalBanks}
          totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>
        
        <RecentTransactions 
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar 
        user={loggedIn}
        transactions={account?.transactions}
        banks={accountsData?.slice(0, 2)}  
      />
    </section>
  )
  :
  (
    <main className='flex-center size-full max-sm:px-6'>
      <section className='auth-form'>
          <header className='flex flex-col gap-5 md:gap-8'>
              <Link href='/' className='cursor-pointer flex items-center gap-1'>
                  <Image
                      src='/icons/logo.svg'
                      alt='Kleva logo'
                      width={34}
                      height={34}
                  />
                  <h1 className='text-26 font-ibm-plex-serif font-bold text-black-1'>Kleva</h1>
              </Link>
              <div className='flex flex-col gap-1 md:gap-3'>
                  <h1 className='text-24 lg:text-36 font-semibold text-grey-900'>
                    Link account
                      <p className='text-16 font-normal text-grey-60'>
                        Link your account to get started
                      </p>
                  </h1>
              </div>
          </header>
              <div className='flex flex-col gap-4'>
                  <MonoConnectButton user={loggedIn} variant="primary"/>
              </div>
      </section>
    </main>
  )
}

export default Home