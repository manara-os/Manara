/**
 * Seed property listings for the Exclusive Leasing module demo.
 * Run from packages/database:
 *   DATABASE_URL=… npx tsx seed_listings.ts
 */
import { PrismaClient, ListingPortal, ListingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany({
    include: { units: { where: { occupancyStatus: 'VACANT' }, take: 2 } },
  });

  console.log(`Found ${properties.length} properties to seed listings for`);

  let created = 0;
  let skipped = 0;

  const portalRoster: { portal: ListingPortal; pause?: boolean }[] = [
    { portal: ListingPortal.BAYUT },
    { portal: ListingPortal.PROPERTY_FINDER },
    { portal: ListingPortal.DUBIZZLE, pause: true },
    { portal: ListingPortal.HAUS_AND_HAUS },
  ];

  for (const prop of properties) {
    if (prop.units.length === 0) {
      skipped++;
      continue;
    }
    const vacantUnit = prop.units[0];
    const rent = Number(vacantUnit.annualRent ?? 80000);

    for (const { portal, pause } of portalRoster.slice(0, 2 + Math.floor(Math.random() * 3))) {
      const existing = await prisma.propertyListing.findFirst({
        where: { workspaceId: prop.workspaceId, propertyId: prop.id, unitId: vacantUnit.id, portal },
      });
      if (existing) continue;

      const status =
        pause ? ListingStatus.PAUSED :
        Math.random() < 0.65 ? ListingStatus.ACTIVE :
        Math.random() < 0.5 ? ListingStatus.DRAFT :
        ListingStatus.EXPIRED;

      const views = status === ListingStatus.ACTIVE ? Math.floor(Math.random() * 800) + 50 : Math.floor(Math.random() * 100);
      const inquiries = Math.floor(views * (0.02 + Math.random() * 0.06));

      await prisma.propertyListing.create({
        data: {
          workspaceId: prop.workspaceId,
          propertyId: prop.id,
          unitId: vacantUnit.id,
          portal,
          title: `${prop.name} · ${vacantUnit.unitNumber} · ${vacantUnit.bedroomCount ?? 1}BR`,
          askingRent: rent,
          status,
          publishedAt: status !== ListingStatus.DRAFT ? new Date(Date.now() - Math.random() * 30 * 86_400_000) : null,
          expiresAt: status !== ListingStatus.DRAFT ? new Date(Date.now() + 30 * 86_400_000) : null,
          externalListingId: status !== ListingStatus.DRAFT ? `${portal.toLowerCase()}-${prop.id.slice(0, 6)}` : null,
          listingUrl: status !== ListingStatus.DRAFT ? `https://www.${portal.toLowerCase().replace('_', '')}.com/listing/${prop.id.slice(0, 8)}` : null,
          views,
          inquiries,
        },
      });
      created++;
    }
  }

  console.log(`Created ${created} listings (skipped ${skipped} properties with no vacant units)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
