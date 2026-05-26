/**
 * One-shot enrichment: add photos + amenities + descriptions to seeded properties
 * so the property detail page has real content to show.
 *
 * Run from project root:
 *   npx tsx /tmp/enrich_properties.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROPERTY_ENRICHMENT: Record<string, {
  photos: string[];
  amenities: string[];
  description: string;
  developerName?: string;
  buildingAge?: number;
  serviceCharge?: number;
  totalFloors?: number;
}> = {
  // Marina Heights (Dubai Marina)
  'Marina Heights': {
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
      'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
    ],
    amenities: ['Swimming Pool', 'Gym', 'Sea View', 'Concierge', 'Underground Parking', 'Beach Access', '24/7 Security'],
    description: 'Premium 4-tower residential community right on the Dubai Marina waterfront. Floor-to-ceiling windows, infinity pool deck, direct promenade access. Walking distance to JBR Beach and Marina Walk.',
    developerName: 'Emaar Properties',
    buildingAge: 5,
    serviceCharge: 18.5,
    totalFloors: 32,
  },
  // Downtown Palms (Downtown Dubai)
  'Downtown Palms': {
    photos: [
      'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    ],
    amenities: ['Rooftop Pool', 'Spa', 'Burj View', 'Gym', 'Valet Parking', 'Sky Lounge', 'Smart Home', 'Yoga Studio'],
    description: 'Boutique residential building moments from Burj Khalifa and Dubai Mall. Smart-home enabled apartments, Italian fixtures, panoramic skyline views from upper floors. Direct metro access via Downtown station.',
    developerName: 'Emaar Properties',
    buildingAge: 3,
    serviceCharge: 22.0,
    totalFloors: 28,
  },
  // JVC Gardens (Jumeirah Village Circle)
  'JVC Gardens': {
    photos: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    ],
    amenities: ['Private Garden', 'Maid\'s Room', 'Driver\'s Room', 'Covered Parking', 'Community Pool', 'Kids Play Area', 'BBQ Area'],
    description: 'Family-friendly villa cluster in the heart of Jumeirah Village Circle. Each villa has a private garden, two covered parking bays, and access to the gated community pool and play areas. Quiet neighbourhood with easy access to Al Khail Road.',
    developerName: 'Nakheel',
    buildingAge: 6,
    serviceCharge: 6.5,
    totalFloors: 2,
  },
  // Palm Residences
  'Palm Residences': {
    photos: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
    ],
    amenities: ['Sea View', 'Private Beach', 'Concierge', 'Spa', 'Multiple Pools', 'Tennis Court', 'Marina'],
    description: 'Iconic Palm Jumeirah residence with private beach access and panoramic Arabian Gulf views. Resort-style amenities, 24/7 concierge, and a private marina for residents.',
    developerName: 'Nakheel',
    buildingAge: 8,
    serviceCharge: 25.0,
    totalFloors: 18,
  },
  // Green Valley Villas
  'Green Valley Villas': {
    photos: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
      'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1200&q=80',
    ],
    amenities: ['Private Pool', 'Garden', 'Maid\'s Room', 'Study', 'Covered Parking', 'Community Park'],
    description: 'Spacious family villas with private swimming pools and landscaped gardens. Located in a gated community with 24/7 security, community parks, and excellent international schools nearby.',
    developerName: 'Damac Properties',
    buildingAge: 7,
    serviceCharge: 8.0,
    totalFloors: 2,
  },
};

async function main() {
  const properties = await prisma.property.findMany();
  console.log(`Found ${properties.length} properties`);

  let updated = 0;
  for (const prop of properties) {
    const enrichment = PROPERTY_ENRICHMENT[prop.name];
    if (!enrichment) {
      console.log(`  ⏭  ${prop.name}: no enrichment defined`);
      continue;
    }

    await prisma.property.update({
      where: { id: prop.id },
      data: {
        photos: enrichment.photos,
        amenities: enrichment.amenities,
        description: enrichment.description,
        developerName: enrichment.developerName ?? prop.developerName,
        buildingAge: enrichment.buildingAge ?? prop.buildingAge,
        serviceCharge: enrichment.serviceCharge ?? prop.serviceCharge,
        meta: {
          ...(prop.meta as object || {}),
          totalFloors: enrichment.totalFloors,
        },
      },
    });
    updated++;
    console.log(`  ✅  ${prop.name}  (${enrichment.photos.length} photos, ${enrichment.amenities.length} amenities)`);
  }

  console.log(`\nEnriched ${updated} of ${properties.length} properties.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
