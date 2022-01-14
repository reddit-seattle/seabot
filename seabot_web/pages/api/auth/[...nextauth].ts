import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord";
import { Environment } from '../../../../src/utils/constants';

export default NextAuth({
    
  // Configure one or more authentication providers
  providers: [
    DiscordProvider({
      clientId: Environment.clientId,
      clientSecret: Environment.clientSecret,
    }),
    // ...add more providers here
  ],
  secret: Environment.hueState,
  theme: {
    colorScheme: 'dark',
  },
  
})