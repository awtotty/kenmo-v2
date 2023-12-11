import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Enrollment } from "@prisma/client";
import { db } from "~/server/db";


const addClassNameToEnrollment = async (enrollment: Enrollment) => {
  return {
    ...enrollment,
    className: await db.class.findFirst({
      where: {
        id: enrollment.classId
      }
    }).then((classObj) => classObj?.name)
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
        enrollments.map(async (enrollment) => await addClassNameToEnrollment(enrollment))
      );
    }),
});
