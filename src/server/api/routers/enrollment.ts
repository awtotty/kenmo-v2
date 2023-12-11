import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Enrollment } from "@prisma/client";
import { db } from "~/server/db";


const addClassInfoToEnrollment = async (enrollment: Enrollment) => {
  const classObj = await db.class.findFirst({
    where: {
      id: enrollment.classId
    }
  });
  return {
    ...enrollment,
    className: classObj?.name,
    classCode: classObj?.classCode,
  }
};

export const enrollmentRouter = createTRPCRouter({
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          userId: ctx.auth?.userId!
        }
      });

      // Use Promise.all to await all promises returned by addClassNameToEnrollment
      return await Promise.all(
        enrollments.map(async (enrollment) => await addClassInfoToEnrollment(enrollment))
      );
    }),

  getByClassCode: publicProcedure
    .input(z.object({
      classCode: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const classObj = await db.class.findFirst({
        where: {
          classCode: input.classCode
        }
      });

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj?.id,
          userId: ctx.auth?.userId!
        }
      });

      return await Promise.all(
        enrollments.map(async (enrollment) => await addClassInfoToEnrollment(enrollment))
      );
    }),
});
