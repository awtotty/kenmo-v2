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
- Having a story map is extremely helpful, even if it's really basic.
  - I took some time off from developing this due to limited available time. Coming back and picking up
    where I left off was made a lot easier by referring to the list of user stories completed and outstanding.
  - This was the story map I used: https://www.figma.com/file/xsd4GCVLP0me0inkLf2bOi/kenmo-stories-and-flows?type=whiteboard&node-id=0-1&t=tQeFmBktWzRjq9VR-0
  - Note that the story map is mostly just a list of user stories, not even prioritized.
- Cron jobs are easy in Vercel now!
  - It's super easy to set a schedule and a routine to run.
  - https://vercel.com/blog/cron-jobs
  - This was used for interest calculations on investment accounts (well, actually all accounts)
- React hook rules are confusing and not well documented
  - The errors produced when these rules are broken are frustrating and challenging to debug.
  - Often these errors appear at unexpected times.
- I'm not very good at API design.
  - Throughout the development of this app, my approach to the API was very ad-hoc. As I needed functions, I wrote them.
  - The result is an API that isn't coherent or elegant.
  - More deliberate practice on API design is a good idea.
- Sentry for monitoring
  - We starting using this at work, and it's pretty amazing. 
  - Allows for high granularity in logs and reports down to the user level. 
- Cron jobs in Vercel are very particular
  - Cron jobs can be triggered by a POST request to the endpoint. (curl -X POST https://kenmo-v2.vercel.app/api/cron -H "Authorization: Bearer $CRON_SECRET")
  - For Vercel to recognize a cron job, it has to be defined in `/vercel.json` (not `/public/vercel.json`, which doesn't work for some reason)

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
