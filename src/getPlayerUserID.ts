export const getPlayerUserID = (token: string, { log }: { log?: boolean } = {}) => JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("ascii")).content.userID;
