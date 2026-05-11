import { TableauDashboard } from "@/components/tableau-dashboard";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  await searchParams;

  return <TableauDashboard tableauUrl={process.env.NEXT_PUBLIC_TABLEAU_VIZ_URL ?? ""} />;
}
