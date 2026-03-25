import { app } from "@azure/functions";
import { getLiveblocksStorage } from "./services/liveblocks.js";
import { sendToExternalApi } from "./services/externalApi.js";

const EVENT_STORAGE_TYPE_MAP = {
  ydocUpdated: "ydoc",
  storageUpdated: "storage",
};

app.http("syncLiveblocksStorage", {
  methods: ["POST"],
  authLevel: "function",
  route: "sync",
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: { error: "Request body must be valid JSON" },
      };
    }

    const { type, data } = body;

    if (!type || !data) {
      return {
        status: 400,
        jsonBody: { error: "Request body must include 'type' and 'data' fields" },
      };
    }

    const { appId, projectId, roomId, updatedAt } = data;

    if (!roomId) {
      return {
        status: 400,
        jsonBody: { error: "'data.roomId' is required" },
      };
    }

    const storageType = EVENT_STORAGE_TYPE_MAP[type];
    if (!storageType) {
      return {
        status: 400,
        jsonBody: {
          error: `Unsupported event type '${type}'. Supported types: ${Object.keys(EVENT_STORAGE_TYPE_MAP).join(", ")}`,
        },
      };
    }

    context.log(`Event: ${type} | Room: ${roomId} | StorageType: ${storageType}`);

    try {
      const storageData = await getLiveblocksStorage(roomId, { storageType }, context);
      context.log(`${storageType} fetched successfully for room: ${roomId}`);

      const result = await sendToExternalApi(storageData, { appId, projectId, roomId, updatedAt, type }, context);
      context.log(`Data sent to external API successfully for room: ${roomId}`);

      return {
        status: 200,
        jsonBody: {
          message: "Sync completed successfully",
          roomId,
          externalApiResponse: result,
        },
      };
    } catch (error) {
      context.log(`Error syncing room ${roomId}: ${error.message}`);

      if (error.status === 404) {
        return {
          status: 404,
          jsonBody: { error: `Room '${roomId}' not found in Liveblocks` },
        };
      }

      return {
        status: 500,
        jsonBody: { error: "Internal server error", details: error.message },
      };
    }
  },
});
