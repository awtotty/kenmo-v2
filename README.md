# Learnings
- To sync data between Clerk accounts and databases, use Clerk webhooks. 
  - This was used becuase the User data model is an extnension of the Clerk user. 
  - The full User model is stored in the database
  - When users are created, updated, or deleted via Clerk, those changes should be reflected in the db. 
  - https://clerk.com/docs/users/sync-data 
- Be careful with db pushes
  - I had to repopulate my test data multiple times due to db push creating incompatible tables. 
  - If you get a warning the db will be cleared, consider a different solution. 
  - In the future, I would like to automate test data generation
- `Promise.all` is required when map involves an async function
  - ChatGPT provided the answer to this immediately after giving the two source files and the error
  - Lots of searching produced no guidance, but ChatGPT worked really quickly
- Double-entry bookeeping is preferred.
  - I scrapped a lot of the early work on transactions that approached bookeeping as single-entry. 

# Build notes
1. Production setup and db schema planning (1.5 hr)
1. Account management with Clerk (0.5 hr)
1. Cash logic and basic home page (2 hr)
1. Enrollment logic and account cards on home page (3 hr)
1. Single account page and dynamic routing for classes (2 hr)
1. Class creation and management (3 hr)
1. 


# Planning notes
## Data structures  
User: 
  - userId 
  - enrollments: List(enrollmentId)
  - transactions: List(transactionId)
  - cash: float

Enrollment: 
  - enrollmentId
  - userId (foreign)
  - classId (foreign)
  - role: enum(teacher, student)
  - bankBalance: float
  - bankInterest: float

Class: 
  - classId
  - name: string
  - enrollments: List(enrollmentId)

Transaction: 
  - transactionId
  - from: userId  
  - to: userId
  - amount: float
  - date: datetime
  - note: string

CustomTransaction: 
  - customTransactionId
  - user
  - amount: float

## Tasks
1. Set up database 
1. User managment with Clerk
1. Class management
1. Transactions
1. Interest
1. Custom transactions
1. UI


# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
