import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Fixed per-department tint so the same team always reads the same colour.
const TINTS = ["bg-lilac", "bg-orange", "bg-[#cfe3d6]", "bg-[#f3e3b5]", "bg-[#d6e2f5]", "bg-[#f5d6d6]", "bg-[#e6e0d3]", "bg-[#d9f0ef]"];

export function EmployeeAvatar({
  firstName,
  lastName,
  departmentId,
  size = "default",
  className,
}: {
  firstName: string;
  lastName: string;
  departmentId: number;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className={cn(TINTS[(departmentId - 1) % TINTS.length], "text-[#1a1a17]")}>
        {firstName[0]}
        {lastName[0]}
      </AvatarFallback>
    </Avatar>
  );
}
