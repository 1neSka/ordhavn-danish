// Validates Grammatikskolen content files.
// Usage: node --import tsx scripts/validate-grammar-content.mjs lib/grammarCourse/content/m2-v2.ts [...more files]
import path from "node:path";
import { pathToFileURL } from "node:url";

const { validateCheckpointContent, validateLessonContent } = await import("../lib/grammarCourse/validate.ts");

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Pass one or more content files to validate.");
  process.exit(2);
}

let failed = false;
for (const file of files) {
  let content;
  try {
    content = (await import(pathToFileURL(path.resolve(file)).href)).default;
  } catch (error) {
    failed = true;
    console.error(`\n✗ ${file}: could not be imported\n  ${error instanceof Error ? error.message : error}`);
    continue;
  }
  if (!content || typeof content !== "object") {
    failed = true;
    console.error(`\n✗ ${file}: needs a default export`);
    continue;
  }
  const report = "lessonId" in content ? validateLessonContent(content) : validateCheckpointContent(content);
  const { stats } = report;
  const kinds = Object.entries(stats.kinds).map(([kind, count]) => `${kind} ${count}`).join(", ");
  console.log(`\n${report.errors.length ? "✗" : "✓"} ${file}`);
  console.log(`  ${stats.items} items · ${kinds}`);
  console.log(`  levels 1/2/3: ${stats.levels[1]}/${stats.levels[2]}/${stats.levels[3]} · judge correct ${stats.judgeCorrect}/${stats.judgeTotal} · cumulative ${stats.cumulative}`);
  for (const error of report.errors) console.log(`  ERROR   ${error}`);
  for (const warning of report.warnings) console.log(`  warning ${warning}`);
  if (report.errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
