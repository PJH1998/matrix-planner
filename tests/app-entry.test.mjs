import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

test("HTML은 앱 진입부를 외부 파일에서 마지막으로 불러온다",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.equal(html.includes("<script>\n(()=>{"),false);
  assert.ok(html.includes('<script src="src/app.js"></script>'));
  assert.ok(html.indexOf('src/app.js')>html.indexOf('updates.js'));
});

test("앱 진입부는 즉시 실행 함수와 엄격 모드를 유지한다",()=>{
  const source=fs.readFileSync(path.join(root,"src/app.js"),"utf8");
  assert.ok(source.startsWith('(()=>{\n"use strict";'));
  assert.ok(source.trimEnd().endsWith("})();"));
});
