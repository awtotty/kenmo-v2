/*
Server code for REST API calls goes here. Uses the publicProcedure from tRPC to expose a REST API 
through an abstraction layer. The client code interfaces with the API. The abstraction layer makes
it easier to program how the client and server talk to one another. 

Good idea: separate different routers into different files. For example, a router for things 
related to posts in a Twitter clone is defined in routers/posts.ts. For kenmo, the router 
routers/transactions.ts defines actions related to sending and receiving Ken Kash. 
*/

import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.example.findMany();
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
