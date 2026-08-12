import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Pothole', weight: 5 },
  { name: 'Illegal Parking', weight: 3 },
  { name: 'Broken Streetlight', weight: 4 },
  { name: 'Graffiti', weight: 2 },
  { name: 'Abandoned Vehicle', weight: 4 },
  { name: 'Road Damage', weight: 5 },
  { name: 'Flooding', weight: 5 },
  { name: 'Waste Issue', weight: 3 },
] as const;

async function main(): Promise<void> {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { weight: category.weight },
      create: category,
    });
  }

  await prisma.municipality.upsert({
    where: { code: 'DEMO' },
    update: { name: 'Demo Municipality' },
    create: { name: 'Demo Municipality', code: 'DEMO' },
  });
}

main()
  .catch(async (error: unknown) => {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
