import { supabase } from "@/lib/supabase";

export type VolunteerDepartmentLink = {
  volunteer_id: string;
  department_id: string;
  team_lead: boolean;
};

export async function listVolunteerDepartments(
  volunteerIds: string[],
): Promise<VolunteerDepartmentLink[]> {
  if (volunteerIds.length === 0) return [];
  const { data, error } = await supabase
    .from("volunteer_departments")
    .select("volunteer_id, department_id, team_lead")
    .in("volunteer_id", volunteerIds);
  if (error) throw error;
  return (data ?? []) as VolunteerDepartmentLink[];
}

export async function addVolunteerToDepartment(
  volunteerId: string,
  departmentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_departments")
    .insert({ volunteer_id: volunteerId, department_id: departmentId });
  if (error) throw error;
}

export async function removeVolunteerFromDepartment(
  volunteerId: string,
  departmentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_departments")
    .delete()
    .eq("volunteer_id", volunteerId)
    .eq("department_id", departmentId);
  if (error) throw error;
}

export async function setVolunteerTeamLead(
  volunteerId: string,
  departmentId: string,
  teamLead: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_departments")
    .update({ team_lead: teamLead })
    .eq("volunteer_id", volunteerId)
    .eq("department_id", departmentId);
  if (error) throw error;
}
