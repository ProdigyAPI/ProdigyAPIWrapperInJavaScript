/* eslint-disable import/first */
/* eslint-disable camelcase */
if (typeof SharedArrayBuffer === "undefined") {
    // @ts-ignore
    global.SharedArrayBuffer = ArrayBuffer;
}
import JSDOM from "jsdom";
import fetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import { URL } from "url";

interface TokenResponse {
    expires_in: string,
    state: string,
    id_token: string,
    access_token: string,
    token_type: "Bearer"
}
interface MasterResponse {
    authToken: string;
    classIDs: number[];
    curriculumOverride: unknown;
    curriculumTreeID: number;
    goalId: unknown;
    grade: number;
    isMember: 0 | 1;
    isTowerTownEnabled: boolean;
    lastVisited: string;
    memberEndDate: string | null;
    memberStartDate: string | null
    name: string;
    objectID: number;
    ownerIDs: number[]
    parentEmail: string | null;
    placementTestID: number
    registerDate: string;
    token: string;
    userID: number;
    usertype: string;
}

const fromEntries = <T = any>(iterable: Iterable<readonly [PropertyKey, T]>) =>
    [...iterable].reduce((obj, [key, val]) => {
        obj[key as string] = val;
        return obj;
    }, {} as { [key: string]: T });

export const tokenify = async (username: string, password: string, { log }: { log?: boolean } = {}) => {
    const cookiefetch: typeof fetch = fetchCookie(fetch);

    if (log) console.log("Fetching login route...");
    const url = fromEntries((await cookiefetch("https://sso.prodigygame.com/game/login", {
        redirect: "manual"
    })).headers).location;
    const formSite = await cookiefetch(url);
    if (!formSite.ok) throw new Error(`The form page request was unable to be fetched with a code of ${formSite.status}.`);
    const site = await formSite.text();
    const dom = new JSDOM.JSDOM(site);
    if (log) console.log("Successfully fetched.");
    const { document } = dom.window;
    const authenticity = document.querySelector("input[name=authenticity_token]")?.getAttribute("value");
    if (!authenticity) throw new Error("Authenticity token failed. No authenticity input was found.");
    if (log) console.log("Authenticity token obtained!");
    const loginParams = new URLSearchParams();
    loginParams.set("utf8", "✓");
    loginParams.set("authenticity_token", authenticity);
    loginParams.set("unauthenticated_game_login_form[username]", username);
    loginParams.set("unauthenticated_game_login_form[password]", password);
    loginParams.set("button", "");
    const login = await cookiefetch(formSite.url, {
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        body: loginParams.toString(),
        method: "POST",
        redirect: "manual"
    });
    if (!login.ok && !login.status.toString().startsWith("3")) throw new Error(`Initial login request was unsuccessful with code ${login.status}.`);
    if (log) console.log(`Initial login request done with a code of ${login.status}.`);
    const playLoginParams = new URLSearchParams();
    playLoginParams.set("authenticity_token", new JSDOM.JSDOM(await (await cookiefetch(login.headers.get("location") ?? "")).text()).window.document.querySelector("input[name=authenticity_token]")?.getAttribute("value") ?? "");
    const schoolLogin = await cookiefetch(`https://sso.prodigygame.com/premises?premises=home&rid=${new URL(login.headers.get("location") || "").searchParams.get("rid")}`, { headers: { "content-type": "application/x-www-form-urlencoded" }, body: playLoginParams.toString(), method: "POST", redirect: "manual" });
    const playLogin = await cookiefetch(schoolLogin.headers.get("location") || "", { redirect: "follow" });
    if (!playLogin.ok && !playLogin.status.toString().startsWith("3")) throw new Error(`Client ID request failed with a code of ${playLogin.status}`);
    if (log) console.log(`Client ID request done with a code of ${playLogin.status}.`);
    const clientId = (await playLogin.text()).match(/const client_id = '([0-9a-f]+)';/)?.[1];
    if (clientId === undefined) throw new Error("Client ID was not found on in the request response.");
    const tokenParams = new URLSearchParams();
    tokenParams.set("client_id", clientId);
    tokenParams.set("redirect_uri", "https://play.prodigygame.com/play");
    tokenParams.set("response_type", "id_token token");
    tokenParams.set("scope", "openid profile email sid identity_provider");
    tokenParams.set("state", "b292a37841634f2eb2c6c283285e0e1a");
    tokenParams.set("nonce", "e651b05312b74195beb22f99a116c630");
    tokenParams.set("prompt", "login");
    tokenParams.set("mobilePlatform", "undefined");
    const tokenLogin = await cookiefetch("https://sso.prodigygame.com/oauth/authorize?" + tokenParams, {
        redirect: "manual"
    });
    if (!tokenLogin.ok && !tokenLogin.status.toString().startsWith("3")) throw new Error(`First authentication request failed with a code of ${tokenLogin.status}.`);
    if (log) console.log(`First token request done with a code of ${tokenLogin.status}.`);
    const secondTokenLogin = await cookiefetch(tokenLogin.headers.get("location") || "", {
        redirect: "manual"
    });
    if (!secondTokenLogin.ok && !secondTokenLogin.status.toString().startsWith("3")) throw new Error(`Second authentication request failed with a code of ${secondTokenLogin.status}.`);
    if (log) console.log(`Second token request done with a code of ${secondTokenLogin.status}.`);
    const tokenProp = new URL((secondTokenLogin.headers.get("location") || "").replace("#", "?")).searchParams;
    const tokenInit: TokenResponse = tokenProp.toString().split("&").reduce((obj, item) => {
        obj[item.split("=")[0]] = decodeURIComponent(item.split("=")[1]);
        return obj;
    }, {} as {[key: string]: any}) as TokenResponse;
    const master = await fetch("https://api.prodigygame.com/game-auth-api/v4/user", {
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            identityToken: tokenInit.access_token
        }),
        method: "POST"
    });
    if (!master.ok) throw new Error(`Master request failed with a code of ${master.status}.`);
    if (log) console.log(`Master request done with a code of ${master.status}.`);
    const masterJson: MasterResponse = await master.json();
    return {
        ...tokenInit,
        ...masterJson
    };
};
