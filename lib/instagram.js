/**
 * Minimal Instagram Graph API client for publishing a single image.
 * Flow: create media container -> wait until FINISHED -> publish.
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing
 */
'use strict';

const VERSION = process.env.GRAPH_API_VERSION || 'v23.0';
const BASE = `https://graph.facebook.com/${VERSION}`;

async function call(method, urlPath, params) {
  const url = `${BASE}/${urlPath}`;
  const res = method === 'GET'
    ? await fetch(`${url}?${new URLSearchParams(params)}`)
    : await fetch(url, { method, body: new URLSearchParams(params) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error || {};
    throw new Error(`Graph API ${method} ${urlPath} failed (${res.status}): ${e.message || 'unknown error'}${e.code ? ` [code ${e.code}]` : ''}`);
  }
  return body;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True if one of the account's most recent posts already has `marker` in its caption. */
async function alreadyPosted({ igUserId, token, marker }) {
  const { data = [] } = await call('GET', `${igUserId}/media`, {
    fields: 'caption,timestamp', limit: '10', access_token: token,
  });
  return data.some((m) => (m.caption || '').includes(marker));
}

/** Instagram fetches the image itself, so make sure the URL is live first. */
async function waitForImage(imageUrl, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(imageUrl, { method: 'HEAD' }).catch(() => null);
    if (res && res.ok && (res.headers.get('content-type') || '').startsWith('image/')) return;
    await sleep(5000);
  }
  throw new Error(`Image never became reachable at ${imageUrl} (is this repository public?)`);
}

async function publishImage({ igUserId, token, imageUrl, caption }) {
  const container = await call('POST', `${igUserId}/media`, {
    image_url: imageUrl, caption, access_token: token,
  });

  for (let i = 0; i < 20; i++) {
    const { status_code: status } = await call('GET', container.id, {
      fields: 'status_code', access_token: token,
    });
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`Media container ${container.id} ended with status ${status}`);
    if (i === 19) throw new Error(`Media container ${container.id} still ${status} after waiting`);
    await sleep(3000);
  }

  const published = await call('POST', `${igUserId}/media_publish`, {
    creation_id: container.id, access_token: token,
  });
  return published.id;
}

module.exports = { alreadyPosted, waitForImage, publishImage };
