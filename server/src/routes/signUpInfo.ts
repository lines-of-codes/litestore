import type { z } from "../../node_modules/zod/lib/external";

export const signUpInfo = z.object({
    email: z.string().email(),
    username: z.string(),
    password: z.string(),
});
