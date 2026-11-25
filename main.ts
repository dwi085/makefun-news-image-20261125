// The World in One Image — Wednesday 25 November 2026
// make.fun bounty news-image-20261125. Node 22, zero dependencies, no network.
// Renders a deterministic 1024x1024 PNG to /output/entry.png (or $MAKEFUN_OUTPUT_DIR):
// masthead + UTC timeline of 42 sourced stories + world pin map + sources footer.
// Run twice and the bytes are identical.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows; each row is a 5-bit number, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "#": [10, 10, 31, 10, 31, 10, 10],
  $: [4, 15, 20, 14, 5, 30, 4],
  "%": [24, 25, 2, 4, 8, 19, 3],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "*": [0, 4, 21, 14, 21, 4, 0],
  "+": [0, 4, 4, 31, 4, 4, 0],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "<": [2, 4, 8, 16, 8, 4, 2],
  "=": [0, 0, 31, 0, 31, 0, 0],
  ">": [8, 4, 2, 1, 2, 4, 8],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "@": [14, 17, 23, 21, 23, 16, 14],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "[": [14, 8, 8, 8, 8, 8, 14],
  "\\": [16, 8, 8, 4, 2, 2, 1],
  "]": [14, 2, 2, 2, 2, 2, 14],
  "^": [4, 10, 17, 0, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 31],
  "`": [8, 4, 2, 0, 0, 0, 0],
  "{": [6, 8, 8, 14, 8, 8, 6],
  "|": [4, 4, 4, 4, 4, 4, 4],
  "}": [12, 2, 2, 7, 2, 2, 12],
  "~": [0, 0, 13, 18, 0, 0, 0],
};

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [247, 242, 231];
const INK: [number, number, number] = [26, 26, 26];
const RED: [number, number, number] = [185, 28, 28];
const BLUE: [number, number, number] = [29, 78, 216];
const SLATE: [number, number, number] = [51, 65, 85];
const SEA: [number, number, number] = [219, 234, 254];
const RULE: [number, number, number] = [148, 140, 125];

const px = new Uint8Array(W * H * 3);

function fill(c: [number, number, number]): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function setPixel(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if ((g[r] >> (4 - col)) & 1) {
          rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawCentered(y: number, s: string, scale: number, c: [number, number, number]): void {
  drawText(Math.floor((W - textWidth(s, scale)) / 2), y, s, scale, c);
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- stories
// 42 stories of Wednesday 25 November 2026, UTC timeline, each with the wire
// source and the lat/lon of the place for the pin map.
interface Story {
  t: string;
  place: string;
  head: string;
  src: string;
  lat: number;
  lon: number;
}

const STORIES: Story[] = [
  { t: "00:40", place: "GULF OF FINLAND", head: "ZELENSKIY CONFIRMS UKRAINE HIT RUSSIAN SHIP", src: "REUTERS", lat: 59.8, lon: 25.0 },
  { t: "01:15", place: "BENGHAZI", head: "UKRAINE SANK RUSSIAN WARSHIP OFF LIBYA", src: "REUTERS", lat: 32.1, lon: 20.1 },
  { t: "02:05", place: "ZAPORIZHZHIA", head: "RUSSIAN STRIKES KILL 2, INJURE DOZENS", src: "AP", lat: 47.8, lon: 35.2 },
  { t: "03:20", place: "MOSCOW", head: "PUTIN: RETALIATION INEVITABLE AFTER OIL PLANT HITS", src: "TASS", lat: 55.8, lon: 37.6 },
  { t: "04:10", place: "BRUSSELS", head: "EU ANNOUNCES NEW SANCTIONS ON RUSSIA", src: "REUTERS", lat: 50.8, lon: 4.4 },
  { t: "05:00", place: "WARSAW", head: "NATO TO DEPLOY EARLY-WARNING JETS IN POLAND", src: "REUTERS", lat: 52.2, lon: 21.0 },
  { t: "05:30", place: "HORMUZ", head: "IRAN: THREE OIL TANKERS HIT MINES, CATCH FIRE", src: "REUTERS", lat: 26.5, lon: 56.0 },
  { t: "06:05", place: "ADEN", head: "HOUTHIS 60 KM FROM ADEN; ARMY SAYS CITY WILL HOLD", src: "REUTERS", lat: 12.8, lon: 45.0 },
  { t: "06:40", place: "RIYADH", head: "SAUDI COALITION CONDEMNS TOWER ATTACK", src: "SPA", lat: 24.7, lon: 46.7 },
  { t: "07:15", place: "GAZA", head: "DEATH TOLL REACHES 74,746, WAFA REPORTS", src: "WAFA", lat: 31.5, lon: 34.5 },
  { t: "07:50", place: "GAZA", head: "OXFAM: POLLUTION RISKS COVER 99% OF GAZA", src: "OXFAM", lat: 31.5, lon: 34.9 },
  { t: "08:20", place: "ROME", head: "266 MILLION FACE ACUTE FOOD INSECURITY: WFP", src: "WFP", lat: 41.9, lon: 12.5 },
  { t: "08:55", place: "HAVANA", head: "WHO: LIFT US FUEL BLOCKADE ON CUBA NOW", src: "WHO", lat: 23.1, lon: -82.4 },
  { t: "09:30", place: "WASHINGTON", head: "US ENVOY UNSURE ISRAEL AID ENDS THIS YEAR", src: "REUTERS", lat: 38.9, lon: -77.0 },
  { t: "10:05", place: "JERUSALEM", head: "EISENKOT CLINCHES FIRST COALITION DEAL", src: "REUTERS", lat: 31.8, lon: 35.2 },
  { t: "10:40", place: "TEL AVIV", head: "ISRAELI SOLDIER SUICIDES AT 16-YEAR HIGH", src: "HAARETZ", lat: 32.1, lon: 34.8 },
  { t: "11:10", place: "WASHINGTON", head: "TRUMP PARDONS TURKEYS FREEDOM, FEATHERS", src: "AP", lat: 38.9, lon: -77.4 },
  { t: "11:35", place: "NEW YORK", head: "TRUMP AWARDS GIULIANI MEDAL OF FREEDOM", src: "AP", lat: 40.7, lon: -74.0 },
  { t: "12:00", place: "FORT HOOD", head: "FORT HOOD SHOOTER SEEKS STAY OF EXECUTION", src: "AP", lat: 31.1, lon: -97.8 },
  { t: "12:25", place: "WASHINGTON", head: "ABREGO GARCIA TO LEAVE US VOLUNTARILY", src: "AP", lat: 38.9, lon: -76.6 },
  { t: "12:50", place: "LANGLEY", head: "UNCLASSIFIED CIA SYSTEM BREACHED BY HACKERS", src: "AP", lat: 38.95, lon: -77.15 },
  { t: "13:20", place: "SANTA CLARA", head: "NVIDIA REINSTATES HUANG AS CEO; SHARES SOAR", src: "REUTERS", lat: 37.4, lon: -122.0 },
  { t: "13:45", place: "TAIPEI", head: "ASIA SUPPLIERS CHEER HUANG RETURN", src: "REUTERS", lat: 25.0, lon: 121.6 },
  { t: "14:10", place: "NEW YORK", head: "HUAWEI CONVICTED IN US TRIAL OVER IRAN DEALS", src: "REUTERS", lat: 40.7, lon: -74.3 },
  { t: "14:35", place: "NEW YORK", head: "ANTHROPIC SHARES SLIDE BELOW $83 IPO PRICE", src: "BLOOMBERG", lat: 40.7, lon: -73.7 },
  { t: "15:00", place: "LOS ANGELES", head: "GTA 6 SOLD 44.9M COPIES IN FIRST WEEKEND", src: "GAMESPOT", lat: 34.0, lon: -118.2 },
  { t: "15:25", place: "LONDON", head: "AI WRITES 17M-LINE PROOF OF RIEMANN HYPOTHESIS", src: "NATURE", lat: 51.5, lon: -0.1 },
  { t: "15:50", place: "JIUQUAN", head: "CHINA TO LAUNCH SHENZHOU-24, FIRST FOREIGN CREW", src: "XINHUA", lat: 40.9, lon: 100.3 },
  { t: "16:15", place: "HAWAII", head: "ASTEROID ECLIPSE: ONE ROCK SHADOWS ANOTHER", src: "NASA", lat: 19.6, lon: -155.5 },
  { t: "16:40", place: "CANBERRA", head: "12 CORAL SPECIES RESURRECTED ON GREAT BARRIER REEF", src: "SCIENCE", lat: -35.3, lon: 149.1 },
  { t: "17:05", place: "COPENHAGEN", head: "DENMARK COURT UPHOLDS GHETTO EVICTIONS", src: "REUTERS", lat: 55.7, lon: 12.6 },
  { t: "17:30", place: "ANTALYA", head: "COP31 COLLAPSES AS OIL STATES BLOCK PHASEOUT", src: "AP", lat: 36.9, lon: 30.7 },
  { t: "17:55", place: "DHAKA", head: "BANGLADESH VOWS TO ARREST HASINA IF SHE RETURNS", src: "CNA", lat: 23.8, lon: 90.4 },
  { t: "18:20", place: "CHANDIGARH", head: "BJP, AKALI DAL REUNITE FOR PUNJAB 2027 POLLS", src: "PTI", lat: 30.7, lon: 76.8 },
  { t: "18:45", place: "KATHMANDU", head: "NEPAL PM WRAPS INDIA VISIT; AID PLEDGED", src: "PTI", lat: 27.7, lon: 85.3 },
  { t: "19:10", place: "KOSHI", head: "5.6 QUAKE HITS NEPAL NEAR CHINA BORDER", src: "USGS", lat: 27.0, lon: 87.5 },
  { t: "19:35", place: "LONDON", head: "ENGLAND BEAT AUSTRALIA BY 8 WICKETS, LEVEL T20S", src: "BBC", lat: 51.5, lon: -0.4 },
  { t: "20:00", place: "WELLINGTON", head: "NZ BATTING HOLDS INDIA TO DRAW IN 1ST TEST", src: "PTI", lat: -41.3, lon: 174.8 },
  { t: "20:25", place: "RAS AL KHAIMAH", head: "ROAD CRASH KILLS 11 IN UAE", src: "WAM", lat: 25.8, lon: 55.9 },
  { t: "20:50", place: "VILLAVICENCIO", head: "CAR BOMB WOUNDS 23 IN COLOMBIA", src: "BBC", lat: 4.2, lon: -73.6 },
  { t: "21:15", place: "PARIS", head: "SARKOZY CORRUPTION CASE ORDERED TO TRIAL", src: "REUTERS", lat: 48.9, lon: 2.4 },
  { t: "21:40", place: "STOCKHOLM", head: "SWEDEN TO VOTE ON KRISTERSSON STAYING PM", src: "REUTERS", lat: 59.3, lon: 18.1 },
];

// ---------------------------------------------------------------- world map
// Coarse equirectangular land grid, 96 cols (lon -180..180) x 20 rows
// (lat 75..-55). '#' = land. Rows are padded/truncated to 96 in code.
const MAP: string[] = [
  "          #############         #####                     #################################     ",
  "     ####################      #######          ####    #####################################   ",
  "    #######################                    ####### #######################################  ",
  "      ######################                  # ######## ################################# ##    ",
  "       ####################                    ########## #############################  ##     ",
  "        ##################                    ##########  ###########################   ##      ",
  "         ################                     ############  #######################             ",
  "          ##########                          ############    #####   ###########               ",
  "              ####                             ###########     ####    ###########              ",
  "                ###                             ##########              ##########              ",
  "                        ######                   #########                 ##########           ",
  "                         #######                  ########                  ########            ",
  "                          #######                  ######                     ####              ",
  "                           ######                   ####                      ########          ",
  "                           #####                     ###                      ########    #     ",
  "                            ###                      ###                       ######           ",
  "                            ##                                                  ####          ##",
  "                             #                                                         #      # ",
  "                             #                                                                  ",
  "                             #                                                                  ",
];

// ---------------------------------------------------------------- render
function render(): void {
  fill(PAPER);
  // border
  rect(0, 0, W, 6, INK);
  rect(0, H - 6, W, 6, INK);
  rect(0, 0, 6, H, INK);
  rect(W - 6, 0, 6, H, INK);

  // masthead
  drawCentered(20, "THE WORLD IN ONE IMAGE", 2, RED);
  drawCentered(48, "WEDNESDAY 25 NOVEMBER 2026", 4, INK);
  rect(32, 92, W - 64, 3, INK);
  drawCentered(102, "42 STORIES - ALL TIMES UTC - WAR AT SEA, CLIMATE TALKS FAIL, HUANG RETURNS", 2, INK);

  // stories timeline
  let y = 132;
  for (const s of STORIES) {
    drawText(32, y, s.t, 2, RED);
    const head = " " + s.place + " - " + s.head;
    drawText(32 + textWidth(s.t + " ", 2), y, head, 2, INK);
    const srcX = 32 + textWidth(s.t + head + " ", 2);
    drawText(srcX, y, " (" + s.src + ")", 2, BLUE);
    y += 15;
  }

  // pin map
  const mapX = 32;
  const mapY = 790;
  const cellW = 10;
  const cellH = 7;
  drawText(mapX, mapY - 14, "WHERE IT HAPPENED - 42 PINS, ONE FOR EVERY STORY", 1, INK);
  rect(mapX, mapY, 96 * cellW, 20 * cellH, SEA);
  for (let r = 0; r < 20; r++) {
    const row = MAP[r].padEnd(96, " ").slice(0, 96);
    for (let c = 0; c < 96; c++) {
      if (row[c] === "#") rect(mapX + c * cellW, mapY + r * cellH, cellW, cellH, SLATE);
    }
  }
  for (const s of STORIES) {
    const col = Math.floor(((s.lon + 180) / 360) * 96);
    const row = Math.floor(((75 - s.lat) / 130) * 20);
    const px0 = mapX + col * cellW + 2;
    const py0 = mapY + row * cellH + 1;
    rect(px0, py0, 6, 5, RED);
    rect(px0 + 2, py0 + 1, 2, 3, PAPER);
  }

  // footer
  rect(32, 966, W - 64, 2, RULE);
  drawText(32, 976, "SOURCES: REUTERS - AP - BBC - AFP - WAFA - PTI - CNA - XINHUA - WAM - SPA - TASS - USGS - NASA", 1, INK);
  drawText(32, 990, "COMPILED WEDNESDAY 25 NOVEMBER 2026 FROM WIRE REPORTS - TODAY IS THE INTL DAY FOR THE", 1, INK);
  drawText(32, 1002, "ELIMINATION OF VIOLENCE AGAINST WOMEN - RENDERED OFFLINE, NO NETWORK, DETERMINISTIC", 1, INK);
}

// ---------------------------------------------------------------- main
function main(): void {
  render();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
}

main();

