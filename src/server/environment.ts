import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  TEST_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsedEnvironment = serverEnvironmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = z.prettifyError(parsedEnvironment.error);
  throw new Error(
    `Invalid server environment. Database access requires a valid PostgreSQL DATABASE_URL. Fix: copy .env.example to .env.local and update its values.\n${details}`,
  );
}

export const serverEnvironment = parsedEnvironment.data;
