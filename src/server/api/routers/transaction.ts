// import { z } from "zod";

// import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
// import { TRPCClientError } from "@trpc/client";

// export const transactionRouter = createTRPCRouter({
//   withdrawFromBank: protectedProcedure.input(
//     z.object({
//       userId: z.string(),
//       amount: z.number(),
//       classCode: z.string(),
//       note: z.string().optional(),
//     }),
//   ).mutation(async ({ ctx, input }) => {
//     if (ctx.auth.userId !== input.userId) {
//       throw new TRPCClientError("You can only withdraw from your own account");
//     }

//     const enrollment = await ctx.db.enrollment.findFirst({
//       where: {
//         userId: input.userId,
//         class: {
//           classCode: input.classCode,
//         },
//       },
//     });

//     if (!enrollment) {
//       throw new TRPCClientError("You are not enrolled in this class");
//     }

//     const updatedEnrollment = await ctx.db.enrollment.update({
//       where: {
//         id: enrollment.id,
//       },
//       data: {
//         bankBalance: {
//           decrement: input.amount,
//         },
//         cash: {
//           increment: input.amount,
//         },
//       },
//     });

//     const newTransaction = await ctx.db.transaction.create({
//       data: {
//         fromEnrollmentId: enrollment.id,
//         toEnrollmentId: enrollment.id,
//         fromUserId: input.userId,
//         toUserId: input.userId,
//         amount: input.amount,
//         note: input.note ?? "Withdraw from bank",
//         transactionType: TransType.WITHDRAW,
//       },
//     });

//     return newTransaction;
//   }),

//   depositToBank: protectedProcedure.input(
//     z.object({
//       userId: z.string(),
//       amount: z.number(),
//       classCode: z.string(),
//       note: z.string().optional(),
//     }),
//   ).mutation(async ({ ctx, input }) => {
//     if (ctx.auth.userId !== input.userId) {
//       throw new TRPCClientError("You can only deposit from your own account");
//     }

//     const enrollment = await ctx.db.enrollment.findFirst({
//       where: {
//         userId: input.userId,
//         class: {
//           classCode: input.classCode,
//         },
//       },
//     });

//     if (!enrollment) {
//       throw new TRPCClientError("You are not enrolled in this class");
//     }

//     const updatedEnrollment = await ctx.db.enrollment.update({
//       where: {
//         id: enrollment.id,
//       },
//       data: {
//         cash: {
//           decrement: input.amount,
//         },
//         bankBalance: {
//           increment: input.amount,
//         },
//       },
//     });

//     const newTransaction = await ctx.db.transaction.create({
//       data: {
//         fromEnrollmentId: enrollment.id,
//         toEnrollmentId: enrollment.id,
//         fromUserId: input.userId,
//         toUserId: input.userId,
//         amount: input.amount,
//         note: input.note ?? "Deposit to bank",
//         transactionType: TransType.DEPOSIT,
//       },
//     });

//     return newTransaction;
//   }),

//   getManyByClassCode: protectedProcedure.input(
//     z.object({
//       userId: z.string(),
//       classCode: z.string(),
//       count: z.number().int().optional(),
//     }),
//   ).query(async ({ ctx, input }) => {
//     const transactions = ctx.db.transaction.findMany({
//       take: input.count ?? 10,
//       where: {
//         OR: [
//           {
//             toUserId: input.userId,
//           },
//           {
//             fromUserId: input.userId,
//           },
//         ],
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     })

//     return transactions;
//   }),

//   // create: protectedProcedure.input(
//   //   z.object({
//   //     from: z.number().int(),
//   //     to: z.number().int(),
//   //     amount: z.number(),
//   //     note: z.string(),
//   //   }),
//   // ).mutation(async ({ ctx, input }) => {
//   //   // User has to be signed in to create a post
//   //   const userId = ctx.auth.userId;

//   //   // Create a new ratelimiter, that allows 3 requests per 1 minute 
//   //   // const ratelimit = new Ratelimit({
//   //   //   redis: Redis.fromEnv(),
//   //   //   limiter: Ratelimit.slidingWindow(3, "1 m"),
//   //   //   analytics: true,
//   //   //   /**
//   //   //    * Optional prefix for the keys used in redis. This is useful if you want to share a redis
//   //   //    * instance with other applications and want to avoid key collisions. The default prefix is
//   //   //    * "@upstash/ratelimit"
//   //   //    */
//   //   //   prefix: "@upstash/ratelimit",
//   //   // });

//   //   // const { success } = await ratelimit.limit(userId);
//   //   // if (!success) {
//   //   //   throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests" });
//   //   // }

//   //   // TODO: check if user has authority to create this transaction

//   //   const fromEnrollment = ctx.db.enrollment.findFirst({
//   //     where: {
//   //       id: input.from,
//   //     },
//   //   });

//   //   const toEnrollment = ctx.db.enrollment.findFirst({
//   //     where: {
//   //       id: input.to,
//   //     },
//   //   });

//   //   console.log("You're transacting from enrollment: ", fromEnrollment);

//   //   const newTransaction = await ctx.db.transaction.create({
//   //     data: {
//   //       fromEnrollmentId: input.from,
//   //       toEnrollmentId: input.to,
//   //       fromUserId: userId,
//   //       toUserId: userId,
//   //       amount: input.amount,
//   //       note: input.note,

//   //     },
//   //   });

//   //   return newTransaction;
//   // }),

// });
