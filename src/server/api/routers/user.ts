import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";
import { clerkClient } from "@clerk/nextjs";
import { type User } from "@clerk/clerk-sdk-node";
import { type Enrollment, Role } from "@prisma/client/edge";

const cleanUserForClient = (user: User) => {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddresses: user.emailAddresses,
    lastSignInAt: user.lastSignInAt,
  };
};

export const userRouter = createTRPCRouter({
  // TODO: can replace this route with useUser on the client
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to create an account");
      }
      return cleanUserForClient(
        await clerkClient.users.getUser(ctx.auth.userId)
      );
    }),

  getAllByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new Error("You must be logged in to view this class");
      }
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
        },
      });
      if (!classObj) {
        throw new Error("Class not found");
      }
      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj?.id,
        },
      });
      if (!enrollments) {
        throw new Error("No enrollments found");
      }
      const adminIds = enrollments
        .filter((enrollment: Enrollment) => enrollment.role === Role.ADMIN)
        .map((enrollment: Enrollment) => enrollment.userId);
      if (!adminIds.includes(ctx.auth?.userId ?? null)) {
        throw new Error("You are not an admin of this class");
      }
      const users = await Promise.allSettled(
        enrollments.map(async (enrollment: Enrollment) => {
          try {
            return await clerkClient.users.getUser(enrollment.userId);
          } catch (error) {
            console.warn(`User ${enrollment.userId} not found in Clerk:`, error);
            return null;
          }
        })
      );
      
      // Filter out failed requests and null results, return only valid users
      return users
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((user): user is User => user !== null);
    }),
});
