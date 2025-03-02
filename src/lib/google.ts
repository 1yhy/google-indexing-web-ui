import { getAccessToken } from "../shared/auth";

import { convertToSiteUrl, checkSiteUrl } from "../shared/gsc";

export async function validateServiceAccount(appEmail: string, privateKey: string, domain: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(appEmail, privateKey);
    if (!accessToken) return false;
    const siteUrl = convertToSiteUrl(domain);
    await checkSiteUrl(accessToken, siteUrl);
    return true;
  } catch {
    return false;
  }
}
