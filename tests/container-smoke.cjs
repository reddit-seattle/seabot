// Mounted into the final runtime image. Run with --network none; never import server.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createCanvas } = require('canvas');

const config = JSON.parse(fs.readFileSync('./dist/seabotConfig.json', 'utf8'));
assert.equal(typeof config.aiDetection.enabled, 'boolean');
const canvas = createCanvas(400, 100);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 400, 100);
ctx.fillStyle = '#00796b';
ctx.font = '20px sans-serif';
ctx.fillText('AI-generated · AI-assisted · Human', 10, 50);
assert.ok(ctx.measureText('SeaBot').width > 0);
const png = canvas.toBuffer('image/png');
assert.equal(png.subarray(1, 4).toString(), 'PNG');
assert.equal(png.readUInt32BE(16), 400);
console.log('Runtime configuration, native canvas, fonts, and PNG encoding passed.');
