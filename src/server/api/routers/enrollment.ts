import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import type { Account, Class, Enrollment } from "@prisma/client/edge";
import { Role } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs";
import { writeAuditLog } from "~/server/audit";
import { captureException } from "~/server/logger";

const cleanEnrollmentForClient = async (
  enrollment: Enrollment,
  classById: Map<number, Pick<Class, "name" | "classCode">>,
  accountById: Map<number, Pick<Account, "id" | "balance">>,
) => {
  let user;
  try {
    user = await clerkClient.users.getUser(enrollment.userId);
  } catch (error) {
    console.warn(`User ${enrollment.userId} not found in Clerk:`, error);
    return null; // Return null for missing users
  }

  const classObj = classById.get(enrollment.classId);
  const checkingAccount = accountById.get(enrollment.checkingAccountId);

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

const loadEnrollmentClientContext = async (
  ctx: {
    db: {
      class: {
        findMany: (args: {
          where: { id: { in: number[] }; deletedAt: null };
          select: { id: true; name: true; classCode: true };
        }) => Promise<Pick<Class, "id" | "name" | "classCode">[]>;
      };
      account: {
        findMany: (args: {
          where: { id: { in: number[] } };
          select: { id: true; balance: true };
        }) => Promise<Pick<Account, "id" | "balance">[]>;
      };
    };
  },
  enrollments: Enrollment[],
) => {
  const classIds = [...new Set(enrollments.map((enrollment) => enrollment.classId))];
  const accountIds = [...new Set(enrollments.map((enrollment) => enrollment.checkingAccountId))];

  const [classes, accounts] = await Promise.all([
    ctx.db.class.findMany({
      where: {
        id: { in: classIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        classCode: true,
      },
    }),
    ctx.db.account.findMany({
      where: {
        id: { in: accountIds },
      },
      select: {
        id: true,
        balance: true,
      },
    }),
  ]);

  return {
    classById: new Map<number, Pick<Class, "name" | "classCode">>(
      classes.map((classObj: Pick<Class, "id" | "name" | "classCode">) => [classObj.id, classObj]),
    ),
    accountById: new Map<number, Pick<Account, "id" | "balance">>(
      accounts.map((account: Pick<Account, "id" | "balance">) => [account.id, account]),
    ),
  };
};

export const enrollmentRouter = createTRPCRouter({
  getAllCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await ctx.db.enrollment.findMany({
      where: {
        userId: ctx.auth.userId,
        class: {
          deletedAt: null,
        },
      },
    });

    const { classById, accountById } = await loadEnrollmentClientContext(ctx, enrollments);

    // Use Promise.allSettled to handle missing Clerk users gracefully
    const results = await Promise.allSettled(
      enrollments.map(
        async (enrollment: Enrollment) => await cleanEnrollmentForClient(enrollment, classById, accountById),
      ),
    );
    
    // Filter out failed requests and null results, return only valid enrollments
    return results
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter((enrollment): enrollment is NonNullable<typeof enrollment> => enrollment !== null);
  }),

  getCurrentUserByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          userId: ctx.auth.userId,
          classId: classObj.id,
        },
      });

      if (1 < enrollments.length) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Multiple enrollments found" });
      }

      if (0 === enrollments.length || !enrollments[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No enrollments found" });
      }

      const { classById, accountById } = await loadEnrollmentClientContext(ctx, enrollments);
      const result = await cleanEnrollmentForClient(enrollments[0], classById, accountById);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found in Clerk" });
      }
      return result;
    }), 

  getAllByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
        },
      });

      if (!enrollments) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No enrollments found" });
      }

      const adminIds = enrollments
        .filter((enrollment: Enrollment) => enrollment.role === Role.ADMIN)
        .map((enrollment: Enrollment) => enrollment.userId);

      if (!adminIds.includes(ctx.auth.userId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not an admin of this class" });
      }

      const studentEnrollments = enrollments
        .filter((enrollment: Enrollment) => enrollment.role != Role.ADMIN);
      const { classById, accountById } = await loadEnrollmentClientContext(ctx, studentEnrollments);

      // Use Promise.allSettled to handle missing Clerk users gracefully
      const results = await Promise.allSettled(
        studentEnrollments
          .map(async (enrollment: Enrollment) => await cleanEnrollmentForClient(enrollment, classById, accountById)),
      );
      
      // Filter out failed requests and null results, return only valid enrollments
      return results
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((enrollment): enrollment is NonNullable<typeof enrollment> => enrollment !== null);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const enrollment = await ctx.db.enrollment.findFirst({
          where: {
            id: input.id,
            class: {
              deletedAt: null,
            },
          },
        });

        if (!enrollment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found" });
        }

        const adminIds = await ctx.db.enrollment.findMany({
          where: {
            classId: enrollment.classId,
            role: Role.ADMIN,
            class: {
              deletedAt: null,
            },
          },
        });

        if (!adminIds) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No admins found for this class" });
        }

        if (
          !adminIds
            .map((enrollment: Enrollment) => enrollment.userId)
            .includes(ctx.auth.userId)
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not an admin of this class" });
        }

        const deletedEnrollment = await ctx.db.$transaction(async (tx) => {
          const deleted = await tx.enrollment.delete({
            where: {
              id: input.id,
            },
          });

          await writeAuditLog(tx, {
            actorUserId: ctx.auth.userId,
            action: "enrollment.delete",
            entityType: "Enrollment",
            entityId: deleted.id,
            classId: deleted.classId,
            metadata: {
              deletedUserId: deleted.userId,
              deletedRole: deleted.role,
              checkingAccountId: deleted.checkingAccountId,
            },
          });

          return deleted;
        });

        if (!deletedEnrollment) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete enrollment" });
        }

        return deletedEnrollment;
      } catch (error) {
        if (!(error instanceof TRPCError)) {
          captureException(error, {
            operation: "enrollment.delete",
            userId: ctx.auth.userId,
            enrollmentId: input.id,
          });
        }
        throw error;
      }
    }),
});
