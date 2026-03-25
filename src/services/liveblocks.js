import { Liveblocks } from "@liveblocks/node";

let _client = null;

function getClient() {
  if (!_client) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      throw new Error("LIVEBLOCKS_SECRET_KEY environment variable is not set");
    }
    _client = new Liveblocks({ secret });
  }
  return _client;
}

/**
 * Fetches storage data for a given Liveblocks room.
 * @param {string} roomId - The Liveblocks room ID
 * @param {object} options
 * @param {"storage"|"ydoc"} options.storageType - Which storage type to read
 * @param {object} context - Azure Function context for logging
 * @returns {Promise<object>} Parsed storage data
 */
export async function getLiveblocksStorage(roomId, { storageType = "storage" } = {}, context) {
  const client = getClient();

  if (storageType === "ydoc") {
    return fetchYdoc(client, roomId, context);
  }

  return fetchStorage(client, roomId, context);
}

async function fetchStorage(client, roomId, context) {
  context.log(`Fetching Liveblocks storage for room: ${roomId}`);

  try {
    const response = await client.getStorageDocument(roomId, "json");
    return response;
  } catch (error) {
    throwLiveblocksError(error);
  }
}

async function fetchYdoc(client, roomId, context) {
  context.log(`Fetching Liveblocks ydoc for room: ${roomId}`);

  try {
    const buffer = await client.getYjsDocumentAsBinaryUpdate(roomId);
    return {
      storageType: "ydoc",
      encoding: "base64",
      data: Buffer.from(buffer).toString("base64"),
    };
  } catch (error) {
    throwLiveblocksError(error);
  }
}

function throwLiveblocksError(error) {
  const status = error?.status ?? error?.response?.status;
  const message = error?.message ?? "Unknown Liveblocks error";
  const err = new Error(`Liveblocks error: ${message}`);
  if (status) err.status = status;
  throw err;
}
