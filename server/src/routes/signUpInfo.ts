import { z } from "zod";

export const signUpInfo = z.object({
    email: z.email(),
    username: z.string(),
    password: z.string(),
});
