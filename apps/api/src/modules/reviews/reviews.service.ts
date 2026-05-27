import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReviewSentiment, ReviewSource } from '@prisma/client';

const computeSentiment = (rating: number, ratingMax: number): ReviewSentiment => {
  const pct = rating / ratingMax;
  if (pct >= 0.8) return ReviewSentiment.POSITIVE;
  if (pct >= 0.5) return ReviewSentiment.NEUTRAL;
  return ReviewSentiment.NEGATIVE;
};

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, filters: { source?: ReviewSource; sentiment?: ReviewSentiment; responded?: boolean } = {}) {
    const reviews = await this.prisma.review.findMany({
      where: {
        workspaceId,
        ...(filters.source && { source: filters.source }),
        ...(filters.sentiment && { sentiment: filters.sentiment }),
        ...(filters.responded !== undefined && { responded: filters.responded }),
      },
      include: { property: { select: { id: true, name: true } } },
      orderBy: { postedAt: 'desc' },
      take: 200,
    });
    return reviews;
  }

  async getDashboard(workspaceId: string) {
    const all = await this.prisma.review.findMany({ where: { workspaceId } });
    const stars = all.filter((r) => r.source !== ReviewSource.INTERNAL_NPS);
    const npsResponses = await this.prisma.npsResponse.findMany({ where: { workspaceId, status: 'RESPONDED', score: { not: null } } });

    const avgRating = stars.length ? stars.reduce((s, r) => s + r.rating, 0) / stars.length : 0;
    const promoters = npsResponses.filter((n) => (n.score ?? 0) >= 9).length;
    const detractors = npsResponses.filter((n) => (n.score ?? 0) <= 6).length;
    const nps = npsResponses.length ? Math.round(((promoters - detractors) / npsResponses.length) * 100) : 0;
    const unresponded = all.filter((r) => !r.responded).length;

    return {
      avgRating: Number(avgRating.toFixed(2)),
      npsScore: nps,
      totalReviews: all.length,
      unresponded,
      sourceBreakdown: this.bySource(all),
    };
  }

  private bySource(reviews: any[]) {
    const out: Record<string, number> = {};
    reviews.forEach((r) => (out[r.source] = (out[r.source] ?? 0) + 1));
    return out;
  }

  create(workspaceId: string, dto: any) {
    return this.prisma.review.create({
      data: {
        workspaceId,
        source: dto.source,
        externalId: dto.externalId,
        authorName: dto.authorName,
        rating: dto.rating,
        ratingMax: dto.ratingMax ?? 5,
        text: dto.text,
        sentiment: dto.sentiment ?? computeSentiment(dto.rating, dto.ratingMax ?? 5),
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        tenantId: dto.tenantId,
        postedAt: dto.postedAt ? new Date(dto.postedAt) : new Date(),
        meta: dto.meta ?? {},
      },
    });
  }

  async respond(workspaceId: string, id: string, userId: string, response: string) {
    return this.prisma.review.update({
      where: { id, workspaceId } as any,
      data: { responded: true, responseText: response, respondedAt: new Date(), respondedById: userId },
    });
  }

  async draftAiResponse(workspaceId: string, id: string) {
    const review = await this.prisma.review.findFirst({ where: { id, workspaceId } });
    if (!review) throw new NotFoundException();
    let draft: string;
    if (review.sentiment === ReviewSentiment.POSITIVE) {
      draft = `Thank you ${review.authorName}! We truly appreciate your kind words. It means a lot to our team. Please let us know if there's anything else we can help with.`;
    } else if (review.sentiment === ReviewSentiment.NEGATIVE) {
      draft = `Hi ${review.authorName}, we sincerely apologise for this experience — it falls short of the standard we hold ourselves to. Our property manager will reach out to you within 2 hours to make this right.`;
    } else {
      draft = `Hi ${review.authorName}, thanks for the thoughtful feedback. We've flagged your concerns with the relevant team and will work to improve.`;
    }
    return this.prisma.review.update({ where: { id }, data: { aiDraftResponse: draft } });
  }
}
