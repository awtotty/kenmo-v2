import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import type { Enrollment } from "@prisma/client";
import { db } from "~/server/db";
import { clerkClient } from "@clerk/nextjs";


const cleanEnrollmentForClient = async (enrollment: Enrollment) => {
  const classObj = await db.class.findFirst({
    where: {
      id: enrollment.classId
    }
  });
  
  const user = await clerkClient.users.getUser(enrollment.userId)

  const investmentAccount = await db.account.findFirst({
    where: {
      id: enrollment.investmentAccountId
    }
  });

  const checkingAccount = await db.account.findFirst({
    where: {
      id: enrollment.checkingAccountId
    }
  });

  return {
    id: enrollment.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress,
    role: enrollment.role,
    className: classObj?.name,
    classCode: classObj?.classCode,
    investmentAccountBalance: investmentAccount?.balance,
    checkingAccountBalance: checkingAccount?.balance,
  }
}

export const enrollmentRouter = createTRPCRouter({
  getAllCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          userId: ctx.auth?.userId!
        }
      });

      // Use Promise.all to await all promises returned by addClassNameToEnrollment
      return await Promise.all(
        enrollments.map(async (enrollment) => await cleanEnrollmentForClient(enrollment))
      );
    }),

  getAllByClassCode: protectedProcedure
    .input(z.object({
      classCode: z.string()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new Error("You must be logged in to view this class");
      }

      const classObj = await db.class.findFirst({
        where: {
          classCode: input.classCode
        }
      });

      if (!classObj) {
        throw new Error("Class not found");
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj?.id,
        }
      });

      if (!enrollments) {
        throw new Error("No enrollments found");
      }

      const adminIds = enrollments.filter((enrollment) => enrollment.role === "ADMIN").map((enrollment) => enrollment.userId);

      if (!(adminIds.includes(ctx.auth?.userId!))) {
        throw new Error("You are not an admin of this class");
      }

      // Use Promise.all to await all promises returned by addClassNameToEnrollment
      return await Promise.all(
        enrollments.map(async (enrollment) => await cleanEnrollmentForClient(enrollment))
      );
    }),
});
