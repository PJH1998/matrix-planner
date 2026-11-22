// 배포 때 encore.moe에서 게임 이미지를 받아 사이트에 함께 올린다.
// 사용법: node scripts/fetch-assets.mjs <출력 폴더> <캐시 폴더>
//   출력: <출력>/char/{id}.webp (정사각형 얼굴), <출력>/card/{id}.webp (편성용 세로 카드),
//         <출력>/weapon/{무기 id}.webp, <출력>/set/{세트 번호}.webp, <출력>/mode/{공명 모드 아이콘}.webp,
//         <출력>/gacha/{id}.webp (픽업 배너 배경), <출력>/stand/{id}.webp (픽업 배너 전신 그림 — data/banners.js 공명자만),
//         <출력>/skin/{id}.webp (전신 그림이 없는 공명자의 스킨 미리보기 — 머리~허벅지만 있어 화면에서 크기를 따로 맞춘다),
//         <출력>/index.json (받은 파일 목록)
// 캐시 폴더에 이미 있는 파일은 다시 받지 않는다. 일부가 실패해도 배포는 계속한다(사이트가 기존 이미지로 대체).
//
// 픽업 배너 그림만: node scripts/fetch-assets.mjs <출력> <캐시> --banners-only  (로컬에서 픽업 화면을 볼 때)
//
// 목록만 쓰기: node scripts/fetch-assets.mjs --manifest <파일>
//   이미지를 받지 않고, 받을 이미지를 정하는 값(공명자 eid · 무기 아이콘 · 세트 아이콘 · 공명 모드 아이콘)만 JSON으로 쓴다.
//   배포 워크플로가 이 파일을 해시해 이미지 캐시 키로 쓴다. 수치만 고친 배포에서는 캐시가 유지된다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ARGS = process.argv.slice(2).filter((a) => a !== '--banners-only');
const BANNERS_ONLY = process.argv.includes('--banners-only');
const MANIFEST = ARGS[0] === '--manifest' ? (ARGS[1] || '.image-manifest.json') : null;
const OUT = ARGS[0] || '_site/img';
const CACHE = ARGS[1] || '.asset-cache';
const API = 'https://api-v2.encore.moe/api/ko/character/';
const WICON = 'https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconWeapon/';
const UA = { 'user-agent': 'matrix-planner-build (+https://github.com/PJH1998/matrix-planner)' };

// 사이트와 같은 순서로 데이터 파일을 한 컨텍스트에 읽는다(등록소 → 데이터). 브라우저 전용 코드는 document가 없어 건너뛴다.
const ctx = {};
ctx.window = ctx; // 브라우저처럼 window = 전역
vm.createContext(ctx);
const run = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
run('core/hub.js');
run('data/weapons.js');
run('data/chars/_list.js');
const MP = ctx.window.MP;
MP.CHAR_LIST.forEach((id) => run(`data/chars/${id}.js`));
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

// 공명자 id → encore.moe 번호(공명자 파일의 eid). 번호가 없는 공명자는 portraits/ 이미지를 쓴다.
const CHAR_EID = Object.fromEntries(MP.CHAR_LIST.map((id) => [id, MP._chars[id] && MP._chars[id].eid]).filter(([, e]) => e != null));
const WEAPONS = ctx.window.WEAPONS || [];
run('data/echoes.js');
const SET_ICON = MP.ECHO_SET_ICON || {};
// 공명 모드 아이콘(공명자 파일의 modes[].icon) — 여러 공명자가 같은 아이콘을 쓴다
const MODE_ICON = [...new Set(MP.CHAR_LIST.flatMap((id) => ((MP._chars[id] || {}).modes || []).map((m) => m.icon)).filter(Boolean))].sort();
// 픽업 배너 공명자(data/banners.js) — 가챠 배경(GachaViewInfo)과 전신 그림(RolePortrait, 없으면 스킨 미리보기)을 받는다
run('data/banners.js');
const BANNER_IDS = [...new Set((MP._banners || []).flatMap((b) => (b.chars || []).map((c) => c.id)))].filter((id) => CHAR_EID[id] != null).sort();

if (MANIFEST) {
  const byFirst = (a, b) => String(a[0]).localeCompare(String(b[0]));
  const manifest = {
    char: Object.entries(CHAR_EID).sort(byFirst),
    weapon: WEAPONS.map(([wid, , , , icon]) => [wid, icon || null]).sort(byFirst),
    set: Object.values(SET_ICON).map(([sid, icon]) => [sid, icon]).sort(byFirst),
    mode: MODE_ICON,
    banner: BANNER_IDS.map((id) => [id, CHAR_EID[id]]),
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`image manifest: char ${manifest.char.length}, weapon ${manifest.weapon.length}, set ${manifest.set.length}, mode ${manifest.mode.length}, banner ${manifest.banner.length} → ${MANIFEST}`);
  process.exit(0);
}

const skip = BANNERS_ONLY ? [] : null;
const charFails = skip || await pool(Object.entries(CHAR_EID), 4, async ([id, eid]) => {
  const sq = path.join(CACHE, 'char', `${id}.webp`);
  const card = path.join(CACHE, 'card', `${id}.webp`);
  if (have(sq) && have(card)) return;
  const r = await fetch(API + eid, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} character ${eid}`);
  const d = await r.json();
  if (d.RoleHeadIconLarge) await download(d.RoleHeadIconLarge, sq);
  if (d.FormationRoleCard) await download(d.FormationRoleCard, card);
});

const weaponFails = skip || await pool(WEAPONS, 8, async ([wid, , , , icon]) => {
  await download(`${WICON}${icon || `T_IconWeapon${wid}_UI`}.webp`, path.join(CACHE, 'weapon', `${wid}.webp`));
});

const SICON = 'https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconElementAttri/';
const setFails = skip || await pool(Object.values(SET_ICON), 6, async ([sid, icon]) => {
  await download(`${SICON}${icon}.webp`, path.join(CACHE, 'set', `${sid}.webp`));
});

const MICON = 'https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/RoleLabel/';
const modeFails = skip || await pool(MODE_ICON, 4, async (icon) => {
  await download(`${MICON}${icon}.webp`, path.join(CACHE, 'mode', `${icon}.webp`));
});

// 픽업 배너: 가챠 배경은 가장 최근 배너(GachaViewInfo 마지막)의 것. 크기 줄이기는 scripts/process-banner-images.py가 한다
const bannerFails = await pool(BANNER_IDS, 3, async (id) => {
  const bg = path.join(CACHE, 'gacha', `${id}.webp`);
  const stand = path.join(CACHE, 'stand', `${id}.webp`);
  const skin = path.join(CACHE, 'skin', `${id}.webp`);
  if (have(bg) && (have(stand) || have(skin))) return;
  const r = await fetch(API + CHAR_EID[id], { headers: UA });
  if (!r.ok) throw new Error(`${r.status} character ${CHAR_EID[id]}`);
  const d = await r.json();
  const under = (d.GachaViewInfo || []).map((g) => g.UnderBgTexturePath).filter(Boolean).pop();
  if (under) await download(under, bg);
  // 전신 그림: 이벤트용 전신(RolePortrait)이 없는 공명자가 있어 스킨 미리보기(PreviewRoleCard)로 대신한다
  const preview = ((d.Skins || [])[0] || {}).PreviewRoleCard;
  try { if (!d.RolePortrait) throw new Error('no RolePortrait'); await download(d.RolePortrait, stand); }
  catch (e) { if (!preview) throw e; await download(preview, skin); }
});

// 직접 넣은 이미지(img-manual/char|card|weapon/*.webp)가 있으면 encore.moe 이미지보다 우선한다.
const MANUAL = 'img-manual';
for (const kind of ['char', 'card', 'weapon']) {
  const src = path.join(MANUAL, kind);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.join(CACHE, kind), { recursive: true });
  for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.webp'))) fs.copyFileSync(path.join(src, f), path.join(CACHE, kind, f));
}

const index = {};
const BANNER_SET = new Set(BANNER_IDS);
for (const kind of ['char', 'card', 'weapon', 'set', 'mode', 'gacha', 'stand', 'skin']) {
  const src = path.join(CACHE, kind);
  // 배너 그림은 지금 배너 공명자 것만 올린다(지난 배너 그림이 캐시에 남아 있어도)
  const files = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => f.endsWith('.webp') && have(path.join(src, f)) && (!['gacha', 'stand', 'skin'].includes(kind) || BANNER_SET.has(f.replace(/\.webp$/, '')))) : [];
  fs.mkdirSync(path.join(OUT, kind), { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(src, f), path.join(OUT, kind, f));
  index[kind] = files.map((f) => f.replace(/\.webp$/, ''));
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));

console.log(`img: char ${index.char.length}, card ${index.card.length}, weapon ${index.weapon.length}, set ${index.set.length}, mode ${index.mode.length}, gacha ${index.gacha.length}, stand ${index.stand.length}, skin ${index.skin.length}`);
for (const f of [...charFails, ...weaponFails, ...setFails, ...modeFails, ...bannerFails]) console.log('  실패:', f);
