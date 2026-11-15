// 배포 때 encore.moe에서 게임 이미지를 받아 사이트에 함께 올린다.
// 사용법: node scripts/fetch-assets.mjs <출력 폴더> <캐시 폴더>
//   출력: <출력>/char/{id}.webp (정사각형 얼굴), <출력>/card/{id}.webp (편성용 세로 카드),
//         <출력>/weapon/{무기 id}.webp, <출력>/index.json (받은 파일 목록)
// 캐시 폴더에 이미 있는 파일은 다시 받지 않는다. 일부가 실패해도 배포는 계속한다(사이트가 기존 이미지로 대체).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const OUT = process.argv[2] || '_site/img';
const CACHE = process.argv[3] || '.asset-cache';
const API = 'https://api-v2.encore.moe/api/ko/character/';
const WICON = 'https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconWeapon/';
const UA = { 'user-agent': 'matrix-planner-build (+https://github.com/PJH1998/matrix-planner)' };

function load(file) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx.window;
}
const have = (f) => fs.existsSync(f) && fs.statSync(f).size > 0;

async function download(url, dest) {
  if (have(dest)) return;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

async function pool(items, n, fn) {
  let i = 0;
  const fails = [];
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const it = items[i++];
      try { await fn(it); } catch (e) { fails.push(String(e.message || e)); }
    }
  }));
  return fails;
}

const { CHAR_EID = {} } = load('assets.js');
const { WEAPONS = [] } = load('weapons.js');

const charFails = await pool(Object.entries(CHAR_EID), 4, async ([id, eid]) => {
  const sq = path.join(CACHE, 'char', `${id}.webp`);
  const card = path.join(CACHE, 'card', `${id}.webp`);
  if (have(sq) && have(card)) return;
  const r = await fetch(API + eid, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} character ${eid}`);
  const d = await r.json();
  if (d.RoleHeadIconLarge) await download(d.RoleHeadIconLarge, sq);
  if (d.FormationRoleCard) await download(d.FormationRoleCard, card);
});

const weaponFails = await pool(WEAPONS, 8, async ([wid, , , , icon]) => {
  await download(`${WICON}${icon || `T_IconWeapon${wid}_UI`}.webp`, path.join(CACHE, 'weapon', `${wid}.webp`));
});

const index = {};
for (const kind of ['char', 'card', 'weapon']) {
  const src = path.join(CACHE, kind);
  const files = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => f.endsWith('.webp') && have(path.join(src, f))) : [];
  fs.mkdirSync(path.join(OUT, kind), { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(src, f), path.join(OUT, kind, f));
  index[kind] = files.map((f) => f.replace(/\.webp$/, ''));
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));

console.log(`img: char ${index.char.length}, card ${index.card.length}, weapon ${index.weapon.length}`);
for (const f of [...charFails, ...weaponFails]) console.log('  실패:', f);
