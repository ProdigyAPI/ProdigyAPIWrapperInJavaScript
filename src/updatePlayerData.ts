import fetch from "node-fetch";
import { getPlayerUserID } from ".";

export const updatePlayerData = async (token: string, data: {}, { log }: { log?: boolean } = {}) => {
    if (log) console.log("Updating player data...");
    const updateres = await fetch(`https://api.prodigygame.com/game-api/v3/characters/${getPlayerUserID(token)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            data: JSON.stringify(data)
        }),
        method: "POST",
        redirect: "follow"
    });
    if (!updateres.ok) throw new Error(`The update player page request was unable to be fetched with a code of ${updateres.status}.`);
    if (log) console.log("Successfully updated.");
};
