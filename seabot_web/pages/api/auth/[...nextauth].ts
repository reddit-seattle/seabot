import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord";
import { Environment } from '../../../../src/utils/constants';

export default NextAuth({
    
  // Configure one or more authentication providers
  providers: [
    DiscordProvider({
      clientId: Environment.clientId,
      clientSecret: Environment.clientSecret,
      authorization: { params: { scope: 'identify guilds messages.read guilds.members.read' } }
    }),
    // ...add more providers here
  ],
  secret: Environment.JWT_SEED,
  theme: {
    colorScheme: 'dark',
  },
  callbacks: {
    async jwt({token, account}) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    }
  }
  
})