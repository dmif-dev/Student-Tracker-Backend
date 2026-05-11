import { prisma } from './src/lib/prisma.js';

async function test() {
  const docs = await prisma.document.findMany({
    where: { id: { startsWith: 'cmp' } }
  });
  console.log(docs.map(d => ({ id: d.id, title: d.title, fileUrl: d.fileUrl })));
  process.exit(0);
}
test();
