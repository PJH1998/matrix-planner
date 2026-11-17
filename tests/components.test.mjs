import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = vm.createContext({ MP: {} });
context.window = context;
context.globalThis = context;
for (const file of ["Icon.js", "FavoriteButton.js", "CharacterCard.js"]) {
  const filename = path.join(ROOT, "src/components", file);
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const character = { id: "test", name: "테스트", el: "glacio", rar: 5 };

test("속성·무기 아이콘을 같은 렌더러로 만든다", () => {
  assert.equal(context.MP.UIIcon.element("glacio", { className: "eli" }), '<img class="eli" src="icons/el-glacio.png" alt="">');
  assert.equal(context.MP.UIIcon.weapon("img/weapon/1.webp"), '<img src="img/weapon/1.webp" alt="" onerror="this.remove()">');
});

test("즐겨찾기 버튼은 켜짐 상태와 접근성 문구를 함께 렌더링한다", () => {
  const html = context.MP.FavoriteButton.render({ character, className: "pfav", active: true, escape });
  assert.match(html, /class="pfav on"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /fill="currentColor"/);
  assert.match(html, /테스트 즐겨찾기/);
});

test("아이콘 카드와 프로필 카드를 공용 컴포넌트가 렌더링한다", () => {
  const token = context.MP.CharacterCard.token({
    character,
    bonus: 25,
    pictureUrl: "portraits/test.webp",
    hasPicture: true,
    squarePicture: false,
    elementName: "응결",
    extra: '<span class="cnt">1/1</span>',
    escape,
  });
  assert.match(token, /class="face pic"/);
  assert.match(token, /이번 주기 피해 \+25%/);
  assert.match(token, /class="cnt"/);

  const profile = context.MP.CharacterCard.profile({
    character,
    growth: { lv: 90, chain: 2 },
    owned: true,
    weapon: { w: { name: "검", q: 5 }, ref: 1 },
    pictureUrl: "portraits/test.webp",
    elementName: "응결",
    favoriteHtml: "<button></button>",
    weaponIconUrl: "img/weapon/1.webp",
    escape,
  });
  assert.match(profile, /class="rcard pcard "/);
  assert.match(profile, /Lv\.90 · <em>2돌파<\/em>/);
  assert.match(profile, /class="pwep q5"/);
});
