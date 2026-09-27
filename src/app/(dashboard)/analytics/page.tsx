import {
  conversionStats,
  funnelByStage,
  conversionBySource,
  conversionByTemperature,
  conversionByAd,
} from "@/lib/queries";
import { AnalyticsClient } from "./analytics-client";
import { exigerPage } from "@/lib/droits";

export const dynamic = "force-dynamic";

/**
 * La vue GÉNÉRALE, toutes formations confondues — pour comparer les sessions.
 * Les statistiques d'une formation vivent dans la formation elle-même.
 */
export default async function AnalyticsPage() {
  await exigerPage("stats");
  const [stats, funnel, bySource, byTemp, byAd] = await Promise.all([
    conversionStats(),
    funnelByStage(),
    conversionBySource(),
    conversionByTemperature(),
    conversionByAd(),
  ]);

  const smallSample = stats.convertedCount < 10 && stats.convertedCount > 0;

  return (
    <AnalyticsClient
      stats={stats}
      funnel={funnel}
      bySource={bySource}
      byTemp={byTemp}
      byAd={byAd}
      smallSample={smallSample}
    />
  );
}
