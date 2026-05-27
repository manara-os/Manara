import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_SCENARIOS = [
  { name: 'Kitchen refresh', icon: '🍳', capexAed: 18000, rentUpliftPct: 6, description: 'New cabinets, quartz tops, mid-range appliances', marketEvidence: 'Bayut: similar refreshed units rent +5-7% in same building', vacancyDaysHint: 30 },
  { name: 'Bathroom upgrade', icon: '🛁', capexAed: 12000, rentUpliftPct: 4, description: 'Re-tile, new vanity, glass shower, fittings', marketEvidence: 'PF: bath-upgraded comps rent +3-5%', vacancyDaysHint: 14 },
  { name: 'Full renovation', icon: '🏗', capexAed: 65000, rentUpliftPct: 18, description: 'Floors, paint, kitchen, baths, AC service, smart locks', marketEvidence: 'Dubizzle: top-quartile units rent +15-22%', vacancyDaysHint: 75 },
  { name: 'Paint + furnish (light)', icon: '🎨', capexAed: 8000, rentUpliftPct: 3, description: 'Repaint, accent walls, basic furnishing kit', marketEvidence: 'Quickest payback for tired interiors', vacancyDaysHint: 10 },
  { name: 'Smart home pack', icon: '🏠', capexAed: 6500, rentUpliftPct: 2.5, description: 'Smart lock, Nest thermostat, doorbell, motorised blinds', marketEvidence: 'Listings with smart tags rent ~2-3% higher', vacancyDaysHint: 2 },
  { name: 'Balcony glazing', icon: '🪟', capexAed: 14000, rentUpliftPct: 5, description: 'Frameless glass balcony enclosure (DM approved)', marketEvidence: 'Adds usable sqft → +4-6%', vacancyDaysHint: 7 },
];

@Injectable()
export class RoiService {
  constructor(private prisma: PrismaService) {}

  async listScenarios(workspaceId: string) {
    let scenarios = await this.prisma.renovationScenario.findMany({
      where: { OR: [{ workspaceId }, { workspaceId: null, isDefault: true }] },
      orderBy: { capexAed: 'asc' },
    });
    if (scenarios.length === 0) {
      // Seed defaults on first call
      for (const s of DEFAULT_SCENARIOS) {
        await this.prisma.renovationScenario.create({ data: { ...s, isDefault: true } });
      }
      scenarios = await this.prisma.renovationScenario.findMany({ where: { isDefault: true }, orderBy: { capexAed: 'asc' } });
    }
    return scenarios;
  }

  simulate(input: { scenarioId?: string; capexAed: number; rentUpliftPct: number; baseAnnualRent: number; vacancyDays: number }) {
    const upliftAnnual = (input.baseAnnualRent * input.rentUpliftPct) / 100;
    const lostRent = (input.baseAnnualRent / 365) * input.vacancyDays;
    const paybackMonths = (input.capexAed + lostRent) / (upliftAnnual / 12);
    const yr5Net = upliftAnnual * 5 - input.capexAed - lostRent;
    const roiPct = ((yr5Net + input.capexAed) / input.capexAed - 1) * 100;
    const chart = Array.from({ length: 61 }, (_, m) => ({
      month: m,
      cumulative: Math.round(-input.capexAed - lostRent + (upliftAnnual / 12) * m),
    }));
    return { upliftAnnual, lostRent, paybackMonths, yr5Net, roiPct, chart };
  }
}
