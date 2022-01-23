import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { Environment, GuildIds, RoleIds } from "../../../../src/utils/constants";
import { ClientHandler } from "../../../apiUtils/clientHandler";

export default NextAuth({
  providers: [
    DiscordProvider({
      clientId: Environment.clientId,
      clientSecret: Environment.clientSecret,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  secret: Environment.JWT_SEED,
  theme: {
    colorScheme: "dark",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async signIn({ account }) {
      try {
        const client = await ClientHandler.getClient();
        const guild = await client?.guilds.fetch(GuildIds.Seattle);
        const user = await guild?.members.fetch(account.providerAccountId);
        return await user?.roles.cache.has(RoleIds.MOD) ?? false;
      } catch (ex: any) {
        console.dir(ex);
        return false;
      }
    },
  },
});
