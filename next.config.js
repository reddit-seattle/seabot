/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  typescript: {
    tsconfigPath: 'tsconfig.json'
  }
}
