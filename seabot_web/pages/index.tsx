import type { NextPage } from 'next'
import useSWR from 'swr';
import { useSession, signOut } from "next-auth/react"
import fetch from 'node-fetch'
import { ChangeEvent, useState } from 'react';
import { NonThreadGuildBasedChannel } from 'discord.js';

const Home: NextPage = () => {
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: session } = useSession();
  const {data: channels, error: error2} = useSWR('/api/getChannels', fetcher);

  const handleChannelSelection = async (event: ChangeEvent<HTMLSelectElement>) => {
    console.log(`selected value - ${event.target.value}`)
    setSelectedChannel(event.target.value)
  };
  const handleMessageTextChange = async (event: ChangeEvent<HTMLInputElement>) => {
    console.log(`selected value - ${event.target.value}`)
    setMessage(event.target.value)
  };
  const sendMessage = async () => {
    await fetch('/api/sendMessage', {
      method: 'POST',
      body:JSON.stringify({
        selectedChannel,
        message
      })
    });
  };

  if (session) {
    return (
      <>
        <button onClick={() => signOut()}>Sign out</button> <br />
        Signed in as {session?.user?.name}
        <br />
        channels:
        <br />
        <select onChange={(event) => handleChannelSelection(event)}>
          {channels?.map((chan: NonThreadGuildBasedChannel) => {
            return <option key={chan.id} value={chan.id}>{chan.name}</option>;
          })}
        </select>
        <input type={"text"} onChange={(evt) => handleMessageTextChange(evt)}/>
        <button onClick={() => sendMessage()}>Send</button>
      </>
    );
  }
  return (
    <>
      Welcome to Seabot!<br/>
      You can read more about me <a href="https://github.com/reddit-seattle/seabot">on my github page</a><br/>
    </>
  )
}

export default Home
