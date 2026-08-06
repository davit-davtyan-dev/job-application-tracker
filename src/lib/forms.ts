import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const requiredTextSchema = z.object({
  value: z.string().trim().min(1, "Enter a value."),
});

export const requiredTextResolver = zodResolver(requiredTextSchema);
