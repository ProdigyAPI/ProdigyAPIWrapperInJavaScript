import fetch from "node-fetch";
import { getPlayerUserID } from "./getPlayerUserID";

export const getPlayerFriendRequests = async (token: string, { log }: { log?: boolean } = {}) => {
    const userID = getPlayerUserID(token);
    if (log) console.log("Fetching player friend requests...");
    const friendreq = await fetch(`https://api.prodigygame.com/friend-api/v1/friend/${userID}/request?userID=${userID}&offset=0&limit=20`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!friendreq.ok) throw new Error(`The friends page request was unable to be fetched with a code of ${friendreq.status}.`);
    return await friendreq.json() as {};
};
