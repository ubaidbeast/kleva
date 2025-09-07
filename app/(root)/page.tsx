
import HeaderBox from '@/components/HeaderBox'
import React from 'react'

const Home = () => {
  const loggedIn ={firstName: "ubaidurrahman"}
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
        </header>
      </div>
    </section>
  )
}

export default Home