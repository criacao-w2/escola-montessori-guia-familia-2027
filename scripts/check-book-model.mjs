import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true } });
try {
  const { default: manifest } = await server.ssrLoadModule("/src/data/book-manifest.json");
  const book = await server.ssrLoadModule("/src/lib/bookModel.js");
  const originalCount = manifest.pageCount;
  for (const count of [originalCount, 86, 100]) {
    manifest.pageCount = count;
    const model = book.buildBookModel();
    const pages = model.leaves.flatMap((leaf) => [leaf.frontPage, leaf.backPage]).filter((p) => p != null);
    assert.deepEqual(pages, Array.from({ length: count }, (_, i) => i + 1));
    assert.equal(model.leafCount, Math.ceil(count / 2));
    assert.equal(model.leaves.at(-1).backPage, count);
    assert.equal(book.positionForFilePage(count), model.leafCount);
    assert.equal(book.navItems().at(-1).position, model.leafCount);
    assert.equal(book.pageIndicatorLabel(model.leafCount).primary, "Contracapa");
    assert.equal(book.chapterForPosition(model.leafCount).kind, "back");
    if (count % 2) assert.equal(model.leaves.at(-1).frontPage, null);
  }
  manifest.pageCount = originalCount;
  assert.equal(manifest.chapters.length, 12);
  assert.deepEqual(manifest.chapters.map((c) => c.filePage), [6, 12, 17, 37, 40, 52, 55, 61, 64, 81, 85, 91]);
  assert.deepEqual(manifest.summary, { filePage: 4, lastFilePage: 5 });
  console.log("OK: PDF com 99 páginas, 12 capítulos, contracapa e compatibilidade com paginação par.");
} finally {
  await server.close();
}
