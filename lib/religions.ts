import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 1000;

export type Religion = {
  name: string;
  memberCount: number;
};

export async function listReligions(): Promise<Religion[]> {
  const counts = new Map<string, number>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("religion_members")
      .select("religion_name")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      counts.set(row.religion_name, (counts.get(row.religion_name) ?? 0) + 1);
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return [...counts.entries()]
    .map(([name, memberCount]) => ({ name, memberCount }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export type SharedSablier = {
  external_id: number;
  religion_name: string;
  grand_priest_name: string | null;
  cleric_name: string | null;
};

export type IndividualSablier = {
  external_id: number;
  religion_name: string;
  priest_name: string | null;
};

export type SablierSummary = {
  total: number;
  sharedPairs: SharedSablier[];
  individualPriests: IndividualSablier[];
};

export async function getSablierSummary(): Promise<SablierSummary> {
  const { data, error } = await supabase
    .from("religion_members")
    .select(
      "external_id, religion_name, character_name, cleric_name, is_grand_priest, is_priest",
    )
    .or("is_grand_priest.eq.true,is_priest.eq.true")
    .order("religion_name", { ascending: true });

  if (error) throw error;

  const sharedPairs = (data ?? [])
    .filter((r) => r.is_grand_priest)
    .map((r) => ({
      external_id: r.external_id,
      religion_name: r.religion_name,
      grand_priest_name: r.character_name,
      cleric_name: r.cleric_name,
    }));

  const individualPriests = (data ?? [])
    .filter((r) => r.is_priest)
    .map((r) => ({
      external_id: r.external_id,
      religion_name: r.religion_name,
      priest_name: r.character_name,
    }));

  return {
    total: sharedPairs.length + individualPriests.length,
    sharedPairs,
    individualPriests,
  };
}
