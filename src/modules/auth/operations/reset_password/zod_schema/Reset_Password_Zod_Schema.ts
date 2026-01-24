import { z } from "zod";

export const resetPasswordZodSchema = z.object({
    resetToken: z
        .string({
            required_error: "Reset token is required",
            invalid_type_error: "Reset token must be a string"
        })
        .nonempty("Reset token cannot be empty"),
    
    newPassword: z
        .string({
            required_error: "New password is required",
            invalid_type_error: "New password must be a string"
        })
        .nonempty("New password cannot be empty")
        .min(8, "New password must be at least 8 characters")
        .refine(
            (val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(val),
            { message: "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)" }
        ),
    
    confirmPassword: z
        .string({
            required_error: "Password confirmation is required",
            invalid_type_error: "Password confirmation must be a string"
        })
        .nonempty("Password confirmation cannot be empty")
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation password do not match",
    path: ["confirmPassword"]
});
