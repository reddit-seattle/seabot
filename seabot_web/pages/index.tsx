import type { NextPage } from 'next'
import useSWR from 'swr';
import { useSession, signIn, signOut } from "next-auth/react"
import fetch from 'node-fetch'
import { ChangeEvent, useEffect, useState } from 'react';

const Home: NextPage = () => {
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: session } = useSession();
  const {data: profile, error} = useSWR('/api/getProfile', fetcher);
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
        profile:
        <br />
        {JSON.stringify(profile)}
        <br />
        channels:
        <br />
        <select onChange={(event) => handleChannelSelection(event)}>
          {channels?.map((chan: {channelId: string, channelName: string}) => {
            console.dir(chan);
            return <option key={chan.channelId} value={chan.channelId}>{chan.channelName}</option>;
          })}
        </select>
        <input type={"text"} onChange={(evt) => handleMessageTextChange(evt)}/>
        <button onClick={() => sendMessage()}>Send</button>
      </>
    );
  }
  return (
    <>
      Not signed in <br />
      <button onClick={() => signIn()}>Sign in</button>
    </>
  )
}

export default Home
