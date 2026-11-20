import { getAuth } from "@clerk/nextjs/server";
import { handleTunnelRequest } from "@sentry/nextjs";
import { type NextApiRequest, type NextApiResponse } from "next";

// The SDK consumes the original envelope stream, not a parsed/re-encoded body.
export const config = { api: { bodyParser: false } };

export const createMonitoringHandler = ({
  getAuthFn = getAuth,
}: {
  getAuthFn?: (req: NextApiRequest) => { userId: string | null };
} = {}) => {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Defense in depth for direct API access, rewrites, and locale aliases.
    let userId: string | null;
    try {
      userId = getAuthFn(req).userId;
    } catch {
      return res.status(401).end("Unauthorized");
    }
    if (!userId) {
      return res.status(401).end("Unauthorized");
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).end("Method not allowed");
    }
    const contentType = req.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== "application/x-sentry-envelope" && contentType !== "text/plain") {
      return res.status(415).end("Unsupported media type");
    }

    // Only the initialized server SDK's DSN is allowed. The SDK does not forward
    // cookies/authorization headers and rejects envelopes for any other DSN.
    await handleTunnelRequest(req, res, { allowedDsns: [] });
  };
};

export default createMonitoringHandler();
