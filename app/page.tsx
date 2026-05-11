import { DashboardView } from "@/components/dashboard-view";
import { getDashboardPayload, normalizeFiltersFromSearchParams } from "@/lib/dashboard-data";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const params = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      params.set(key, value);
    }
  });

  const payload = await getDashboardPayload(normalizeFiltersFromSearchParams(params));

  return <DashboardView initialPayload={payload} />;
}
