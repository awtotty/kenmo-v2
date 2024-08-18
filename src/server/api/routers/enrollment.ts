import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import type { Enrollment } from "@prisma/client/edge";
import { db } from "~/server/db";
import { clerkClient } from "@clerk/nextjs";

const cleanEnrollmentForClient = async (enrollment: Enrollment) => {
  const classObj = await db.class.findFirst({
    where: {
      id: enrollment.classId,
    },
  });

  const user = await clerkClient.users.getUser(enrollment.userId);

  const checkingAccount = await db.account.findFirst({
    where: {
      id: enrollment.checkingAccountId,
    },
  });

  return {
    id: enrollment.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress,
    role: enrollment.role,
    className: classObj?.name,
    classCode: classObj?.classCode,
    checkingAccountBalance: checkingAccount?.balance,
    checkingAccountId: checkingAccount?.id,
  };
};

export const enrollmentRouter = createTRPCRouter({
  getAllCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await ctx.db.enrollment.findMany({
      where: {
        userId: ctx.auth?.userId ?? null,
      },
    });

    // Use Promise.all to await all promises returned by addClassNameToEnrollment
    return await Promise.all(
      enrollments.map(
        async (enrollment: Enrollment) => await cleanEnrollmentForClient(enrollment),
      ),
    );
  }),

  getCurrentUserByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new Error("You must be logged in to view this class");
      }

      const classObj = await db.class.findFirst({
        where: {
          classCode: input.classCode,
        },
      });

      if (!classObj) {
        throw new Error("Class not found");
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          userId: ctx.auth.userId,
          classId: classObj.id,
        },
      });

      if (!enrollments) {
        throw new Error("No enrollments found");
      }

      if (1 < enrollments.length) {
        throw new Error("Multiple enrollments found");
      }

      if (0 === enrollments.length) {
        throw new Error("No enrollments found");
      }

      if (!enrollments[0]) {
        throw new Error("No enrollments found");
      }

      return await cleanEnrollmentForClient(enrollments[0]);
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

      const classObj = await db.class.findFirst({
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
        .filter((enrollment: Enrollment) => enrollment.role === "ADMIN")
        .map((enrollment: Enrollment) => enrollment.userId);

      if (!adminIds.includes(ctx.auth?.userId ?? null)) {
        throw new Error("You are not an admin of this class");
      }

      // Use Promise.all to await all promises returned by addClassNameToEnrollment
      return await Promise.all(
        enrollments.map(
          async (enrollment: Enrollment) => await cleanEnrollmentForClient(enrollment),
        ),
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const enrollment = await ctx.db.enrollment.findFirst({
        where: {
          id: input.id,
        },
      });

      if (!enrollment) {
        throw new Error("Enrollment not found");
      }

      const adminIds = await ctx.db.enrollment.findMany({
        where: {
          classId: enrollment.classId,
          role: "ADMIN",
        },
      });

      if (
        !adminIds
          .map((enrollment: Enrollment) => enrollment.userId)
          .includes(ctx.auth?.userId ?? null)
      ) {
        throw new Error("You are not an admin of this class");
      }

      const deletedEnrollment = await ctx.db.enrollment.delete({
        where: {
          id: input.id,
        },
      });

      if (!deletedEnrollment) {
        throw new Error("Failed to delete enrollment");
      }

      return deletedEnrollment;
    }),
});
