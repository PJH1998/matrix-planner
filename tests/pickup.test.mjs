import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

const BANNER = ["lily", "sigrika", "qiuyuan", "xuanling", "suisui", "hiyuki"];
// 배너 공명자는 미보유, 예시 편성에서 배너 공명자가 든 파티는 뺀다
function withoutBanner(app) {
  const ids = app.defaults().map((c) => c.id);
  const owned = Object.fromEntries(ids.map((id) => [id, !BANNER.includes(id)]));
  const teams = app.state().teams.filter((t) => !t.slots.some((x) => BANNER.includes(x)));
  app.reset({ owned, teams });
}

test("BannerDB는 날짜로 지금 픽업과 다음 픽업을 고른다", () => {
  const app = loadCurrentApp();
  const mid = Date.parse("2026-11-22T00:00:00+08:00");
  assert.equal(app.bannerCurrent(mid).phase, 1);
  assert.deepEqual(app.bannerCurrent(mid).chars.map((c) => c.id), ["lily", "sigrika", "qiuyuan"]);
  assert.equal(app.bannerCurrent(mid).chars[0].isNew, true);
  assert.equal(app.bannerNext(mid).phase, 2);
  assert.equal(app.bannerNext(mid).tentative, true);
  assert.equal(app.banners(mid).length, 2);

  const later = Date.parse("2026-12-10T00:00:00+08:00");
  assert.equal(app.bannerCurrent(later).phase, 2);
  assert.equal(app.bannerNext(later), null);
  assert.equal(app.banners(Date.parse("2027-06-01T00:00:00+08:00")).length, 0);
});

test("기본 무기는 상시 5성 무기, 서포터는 4성 공명 효율 무기도 후보", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  // 딜러: 같은 종류의 상시 5성 무기(210X0015) R1
  assert.deepEqual([app.pickupBase("sigrika").wid, app.pickupBase("sigrika").ref], [21040015, 1]);
  assert.equal(app.pickupBase("hiyuki").wid, 21020015);
  // 서포터: 상시 5성(R1)과 4성 공명 효율 무기(R5) 중 협주력이 높은 쪽
  for (const id of ["lily", "suisui"]) {
    const b = app.pickupBase(id);
    assert.ok(["std", "er4"].includes(b.kind), id);
    assert.equal(b.ref, b.kind === "std" ? 1 : 5);
  }
});

test("전용 무기 선택: 미보유는 0체인 + 기본 무기 또는 전용 무기, 보유는 체인 +1(+ 전용 무기)", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  const [base] = app.pickupOptions("sigrika");
  assert.equal(base.patch.growth.chain, 0);
  assert.equal(base.patch.growth.wid, 21040015);
  assert.equal(base.cost, 95);
  const [sig] = app.pickupOptions("sigrika", null, { weapon: true });
  assert.deepEqual([sig.patch.growth.wid, sig.patch.growth.ref, sig.cost, sig.weapon], [21040066, 1, 165, true]);

  app.reset({ owned: { sigrika: true }, growth: { sigrika: { chain: 2, wid: 21040015, ref: 1 } } });
  const [up] = app.pickupOptions("sigrika");
  assert.deepEqual([up.from, up.to, up.patch.growth.chain, up.patch.growth.wid], [2, 3, 3, undefined]);
  const [upW] = app.pickupOptions("sigrika", null, { weapon: true });
  assert.deepEqual([upW.patch.growth.chain, upW.patch.growth.wid, upW.cost], [3, 21040066, 165]);

  // 6체인: 전용 무기만 남는다. 전용 무기까지 있으면 더 뽑을 것이 없다
  app.reset({ owned: { sigrika: true }, growth: { sigrika: { chain: 6, wid: 21040015, ref: 1 } } });
  assert.equal(app.pickupOptions("sigrika").length, 0);
  assert.equal(app.pickupOptions("sigrika", null, { weapon: true })[0].key, "weapon");
  app.reset({ owned: { sigrika: true }, growth: { sigrika: { chain: 6 } } });
  assert.equal(app.pickupOptions("sigrika", null, { weapon: true }).length, 0);
});

test("조합 후보에는 메인 딜러 2명 조합이 정석 짝(궁합 1)일 때만 들어간다", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  const roles = Object.fromEntries(app.defaults().map((c) => [c.id, c.role]));
  for (const id of ["sigrika", "lily", "qiuyuan"]) {
    const list = app.pickupCandidates(id);
    assert.ok(list.length > 0, id);
    list.forEach((c) => {
      assert.ok(c.slots.includes(id));
      const dps = c.slots.filter((x) => roles[x] === "dps");
      assert.ok(dps.length <= 2);
      if (dps.length === 2) assert.ok(Math.max(app.pairs(dps[0])[dps[1]] || 0, app.pairs(dps[1])[dps[0]] || 0) >= 1, c.slots.join("/"));
      assert.ok(c.slots.filter((x) => roles[x] === "support").length <= 1);
    });
  }
  // 릴리는 고정 조합(여우의 별자리·쇄명·릴리)이 정석
  assert.ok(app.pickupCandidates("lily").some((c) => c.standard && ["hsin", "suoming", "lily"].every((x) => c.slots.includes(x))));
});

test("정석·서브 조합은 배치 횟수를 다 쓴 공명자의 파티를 포기 대상으로 알려 준다", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  const teams = app.state().teams;
  const combos = app.pickupCombos("lily");
  assert.ok(combos.some((c) => c.kind === "standard"));
  combos.filter((c) => !c.missing.length).forEach((c) => {
    assert.ok(c.slots.includes("lily"));
    c.giveUp.forEach((g) => assert.ok(c.slots.some((x) => x !== "lily" && teams[g.index].slots.includes(x))));
    // 비교 기준(X 대신 다른 공명자)이 있으면 그만큼 총점 변화가 줄어든다
    assert.ok(c.dTotal <= c.dRaw + 1e-9);
  });
  // 여우의 별자리·쇄명은 이미 파티 04에 있어 정석 조합을 넣으면 그 파티를 포기한다
  const std = combos.find((c) => c.kind === "standard" && !c.missing.length);
  assert.ok(std.giveUp.some((g) => teams[g.index].slots.includes("hsin")));
});

test("정석은 최적 조합(고정 조합 · 기준 파티)을 보유·총점과 상관없이 맨 앞에, 서브는 궁합 있는 조합을 먼저 보여 준다", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  const names = (c) => c.slots.slice().sort().join("/");
  const preset = ["hiyuki", "lucilla", "suisui"].sort().join("/");
  // 히유키도 픽업이라 미보유 → 고정 조합(히유키·루실라·수수)은 「있어야 만들 수 있는 조합」으로 맨 앞
  let combos = app.pickupCombos("suisui");
  assert.equal(names(combos[0]), preset);
  assert.equal(combos[0].optimal, true);
  assert.deepEqual(combos[0].missing, ["hiyuki"]);
  // 양양·현령의 기준 파티(양양·현령·치사·수수)도 최적 조합 — 수수가 없어도 맨 앞
  const xl = app.pickupCombos("xuanling");
  assert.equal(names(xl[0]), ["xuanling", "chisa", "suisui"].sort().join("/"));
  assert.equal(xl[0].optimal, true);
  assert.deepEqual(xl[0].missing, ["suisui"]);
  // 수수 쪽에도 두 번째 최적 조합으로 나온다
  assert.ok(combos.slice(0, 2).some((c) => names(c) === ["xuanling", "chisa", "suisui"].sort().join("/") && c.optimal));
  // 히유키를 보유하면 고정 조합을 넣어 보고 맨 앞에 둔다(총점이 더 오르는 정석이 있어도)
  app.reset({ owned: { ...app.state().owned, hiyuki: true } });
  combos = app.pickupCombos("suisui");
  assert.equal(names(combos[0]), preset);
  assert.equal(combos[0].missing.length, 0);
  assert.ok(Number.isFinite(combos[0].dTotal));
  // 서브: 카르티시아처럼 궁합 표에 수수가 없는 메인 딜러 조합보다 궁합 있는 조합이 먼저
  const sub = combos.find((c) => c.kind === "sub");
  if (sub) assert.equal(sub.linked, true, sub.slots.join("/"));
});

test("서브 딜러는 새 메인 딜러와 시너지가 더 클 때만 다른 파티에서 데려온다", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  const teams = app.state().teams;
  // 산화는 파티 01(카멜리아)에 있다. 카멜리아와의 시너지가 더 커서 릴리 조합으로 데려오지 않는다
  const blocked = app.pickupBlocked("lily");
  assert.ok(blocked.some((b) => b.blocked.id === "sanhua" && b.blocked.from === "camellya" && teams[b.blocked.index].slots.includes("sanhua")));
  // 실제로 나온 조합의 「데려오는 서브 딜러」는 모두 시너지가 더 크다
  for (const id of ["lily", "sigrika", "hiyuki"]) {
    app.pickupCombos(id).forEach((c) => (c.giveUp || []).forEach((g) => (g.take || []).forEach((t) => {
      if (t.why) assert.ok(t.why.sNew > t.why.sOld, `${id}: ${t.id}`);
    })));
  }
});

test("데려오는 서브 딜러가 그 파티의 메인 딜러 자신이면 시너지 비교 이유를 남기지 않는다", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  // 젠니·페비·벨리나 파티는 피해가 가장 큰 페비가 메인 딜러로 잡힌다 → 페비를 데려올 때 비교할 상대가 없다
  app.reset({ owned: app.state().owned, teams: [{ slots: ["zani", "phoebe", "verina"], buff: null }] });
  const takes = app.pickupCombos("xuanling").flatMap((c) => (c.giveUp || []).flatMap((g) => g.take || []));
  assert.ok(takes.some((t) => t.id === "phoebe"), "페비를 데려오는 조합이 있어야 한다");
  takes.forEach((t) => { if (t.why) assert.notEqual(t.why.from, t.id, t.id); });
});

test("새로 뽑기 분석은 상태를 바꾸지 않고, 전용 무기를 고르면 조합 점수가 오른다", () => {
  const app = loadCurrentApp();
  withoutBanner(app);
  const before = app.state();
  const banner = [{ ver: "t", phase: 1, chars: [{ id: "sigrika" }] }];
  const [row] = app.pickup(banner).rows;
  assert.deepEqual(app.state(), before);
  assert.equal(row.owned, false);
  assert.equal(row.weaponOn, false);
  assert.ok(row.main.gain >= 0);
  assert.ok(row.grade && typeof row.grade.label === "string");
  // 전용 무기 선택 옆 수치: 기본 무기 → 전용 무기 강도 변화
  assert.equal(row.weaponPower.kind, "damage");
  assert.ok(row.weaponPower.pct > 0);
  const [withW] = app.pickup(banner, { sigrika: true }).rows;
  assert.deepEqual(app.state(), before);
  assert.equal(withW.weaponOn, true);
  assert.equal(withW.main.cost, 165);
  assert.ok(withW.main.gain > row.main.gain);
});

test("돌파는 그 공명자 강도만 본다: 딜러는 개인 피해, 서포터는 협주력", () => {
  const app = loadCurrentApp();
  const rows = app.pickup([{ ver: "t", phase: 1, chars: [{ id: "sigrika" }, { id: "lily" }] }]).rows;
  const sigrika = rows.find((r) => r.id === "sigrika"), lily = rows.find((r) => r.id === "lily");
  assert.equal(sigrika.owned, true);
  assert.equal(sigrika.grade, null);
  assert.equal(sigrika.main.power.kind, "damage");
  closeEnough(sigrika.main.power.before, app.damage("sigrika"));
  assert.ok(sigrika.main.power.pct > 0);
  assert.equal(lily.main.power.kind, "support");
  closeEnough(lily.main.power.before, app.charScore("lily"));
  assert.ok(lily.main.power.after > lily.main.power.before);
  // 기본 편성의 시그리카는 이미 전용 무기라 전용 무기 선택이 없다
  assert.equal(sigrika.hasSignature, true);
  assert.equal(sigrika.weaponPower, null);
});

function closeEnough(a, b) {
  assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
}
