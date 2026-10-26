// Loaded before EVERY test process. Tests must inject transports and never contact services.
const blocked = () => { throw new Error('Network access is forbidden in SeaBot tests'); };
globalThis.fetch = blocked;
globalThis.WebSocket = class { constructor() { blocked(); } };
require('node:net').Socket.prototype.connect = blocked;
require('node:tls').connect = blocked;
for (const module of ['node:http', 'node:https']) {
  require(module).request = blocked;
  require(module).get = blocked;
}
delete process.env.botToken;
delete process.env.PANGRAM_API_KEY;
