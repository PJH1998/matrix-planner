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
