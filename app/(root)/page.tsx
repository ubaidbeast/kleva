
import HeaderBox from '@/components/HeaderBox'
import RightSidebar from '@/components/RightSidebar'
import TotalBlanceBox from '@/components/TotalBlanceBox'
import React from 'react'

const Home = () => {
  const loggedIn ={firstName: "ubaidurrahman", lastName: 'nuh', email: 'ubaidurrahman@example.com'}
  return (
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
          accounts={[]}
          totalBanks={1}
          totalCurrentBalance={1250.35}
          />
        </header>
        RECENT TRANSCTIONS
      </div>

      <RightSidebar 
        user={loggedIn}
        transactions={[]}
        banks={[{currentBalance: 123.50}, {currentBalance: 456.78}]}
      />
    </section>
  )
}

export default Home