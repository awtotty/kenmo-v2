import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";

export const classRouter = createTRPCRouter({
  getClassById: publicProcedure
    .input(z.object({
      classId: z.number().int()
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.class.findFirst({
        where: {
          id: input?.classId
        }
      })
    }),

  getClassByCode: publicProcedure
    .input(z.object({
      classCode: z.string()
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.class.findFirst({
        where: {
          classCode: input?.classCode
        }
      })
    }),

  create: protectedProcedure
    .input(z.object({
      className: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to create a class")
      }

      // check if the user is already enrolled in a class with the same name
      while (true) {
        const existingEnrollment = await ctx.db.enrollment.findFirst({
          where: {
            userId: ctx.auth?.userId!,
            class: {
              name: input.className,
            }
          }
        })

        if (!existingEnrollment) {
          break
        }

        else {
          input.className = input.className + " (1)"
        }
      }

      // generate new class code 
      let code = Math.random().toString(36).substring(2, 8).toUpperCase()
      while (await ctx.db.class.findFirst({ where: { classCode: code } })) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase()
      }

      const newClass = await ctx.db.class.create({
        data: {
          name: input?.className,
          classCode: code,
        }
      })

      if (!newClass) {
        throw new TRPCClientError("Failed to create class")
      }

      // enroll the user as an admin for the class
      const enrollmentCreated = await ctx.db.enrollment.create({
        data: {
          userId: ctx.auth.userId,
          classId: newClass.id,
          role: "ADMIN",
          investmentAccountId: -1,
          checkingAccountId: -1,
        }
      })

      return { classCode: newClass.classCode };
    }),

  join: protectedProcedure
    .input(z.object({
      classCode: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to join a class")
      }

      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
        }
      })

      if (!classObj) {
        throw new TRPCClientError("Class not found")
      }

      const enrollment = await ctx.db.enrollment.findFirst({
        where: {
          userId: ctx.auth.userId,
          classId: classObj.id,
        }
      })

      if (enrollment) {
        throw new TRPCClientError("You are already enrolled in this class")
      }

      // create two new accounts: one for investment and one for checking
      // TODO: 
      const investmentAccount = await ctx.db.account.create({
        data: {
        }
      })

      const checkingAccount = await ctx.db.account.create({
        data: {
        }
      })


      const newEnrollment = await ctx.db.enrollment.create({
        data: {
          userId: ctx.auth.userId,
          classId: classObj.id,
          role: "STUDENT",
          investmentAccountId: -1,
          checkingAccountId: -1,
        }
      })

      return { classCode: classObj.classCode }
    }),


});
