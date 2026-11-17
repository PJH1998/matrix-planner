import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

test("HTML은 앱 계층을 정해진 순서로 마지막에 불러온다",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.equal(html.includes("<script>\n(()=>{"),false);
  const files=["src/app/core.js","src/app/views.js","src/app/interactions.js","src/app.js"];
  const positions=files.map(file=>html.indexOf(`<script src="${file}"></script>`));
  assert.ok(positions.every(position=>position>=0));
  assert.ok(positions.every((position,index)=>index===0||position>positions[index-1]));
  assert.ok(positions[0]>html.indexOf('updates.js'));
});

test("분리된 앱 파일은 각 책임과 엄격 모드를 유지한다",()=>{
  const expected=[
    ["src/app/core.js","/* ---------- static data ---------- */"],
    ["src/app/views.js","/* ---------- render: pool ---------- */"],
    ["src/app/interactions.js","/* ---------- placement logic ---------- */"],
    ["src/app.js","/* ---------- routing ---------- */"],
  ];
  expected.forEach(([file,marker])=>{
    const source=fs.readFileSync(path.join(root,file),"utf8");
    assert.ok(source.startsWith('"use strict";'));
    assert.ok(source.includes(marker));
  });
});

test("CSS 변수에 넣는 캐릭터 이미지는 페이지 기준 절대 URL을 사용한다",()=>{
  const source=fs.readFileSync(path.join(root,"src/app/core.js"),"utf8");
  assert.ok(source.includes("const assetUrl=path=>new URL(path,document.baseURI).href"));
  assert.match(source,/const picUrl=id=>assetUrl\(/);
  assert.match(source,/const cardUrl=id=>gameImg\.card\.has\(id\)\?assetUrl\(/);
});

test("에코 빈칸 선택과 이미지 파일 불러오기를 분리한다",()=>{
  const views=fs.readFileSync(path.join(root,"src/app/views.js"),"utf8");
  const interactions=fs.readFileSync(path.join(root,"src/app/interactions.js"),"utf8");
  assert.ok(views.includes('id="pfEOpen"'));
  assert.ok(interactions.includes('if(e.target.id==="pfEOpen"){$("#pfEFile").click();return}'));
  assert.ok(interactions.includes('if(es.classList.contains("empty")){echoSel=i;renderProfile();return}'));
  assert.equal(interactions.includes('echoSel=i;renderProfile();$("#pfEFile").click()'),false);
});
