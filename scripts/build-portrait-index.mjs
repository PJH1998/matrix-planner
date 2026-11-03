// portraits/ 폴더의 이미지 파일 목록을 portraits/index.json으로 만듭니다.
// GitHub Actions 배포 때 자동으로 실행되며, 로컬에서는 `node scripts/build-portrait-index.mjs`로 실행합니다.
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "portraits");
const files = readdirSync(dir)
  .filter((f) => /\.(png|jpe?g|webp|avif|gif)$/i.test(f))
  .map((f) => f.normalize("NFC"))
  .sort();
writeFileSync(join(dir, "index.json"), JSON.stringify(files, null, 2) + "\n");
console.log(`portraits/index.json: ${files.length} files`);
