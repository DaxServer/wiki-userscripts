#!/usr/bin/env bun
// Update Commons page with new-category.js content using OAuth 1.0a

import OAuth from 'oauth-1.0a';
import crypto from 'node:crypto';

interface TokenResponse {
  query: {
    tokens: {
      csrftoken: string;
    };
  };
  error?: {
    code: string;
    info: string;
  };
}

interface EditResponse {
  edit: {
    title: string;
    oldrevid: number;
    newrevid: number;
  };
  error?: {
    code: string;
    info: string;
  };
}

const API_BASE = 'https://commons.wikimedia.org/w/api.php';

const args = process.argv.slice(2);
if (!args[0] || !args[1]) {
  console.error('Usage: update-commons.ts <local-file> <wiki-page-title>');
  process.exit(1);
}
const localFile: string = args[0];
const pageTitle: string = args[1];

// OAuth credentials from environment variables
const credentials = {
  consumerKey: process.env!.MW_CONSUMER_TOKEN!,
  consumerSecret: process.env!.MW_CONSUMER_SECRET!,
  token: process.env!.MW_ACCESS_TOKEN!,
  tokenSecret: process.env!.MW_ACCESS_SECRET!,
};

// Initialize OAuth 1.0a
const oauth = new OAuth({
  consumer: { key: credentials.consumerKey, secret: credentials.consumerSecret },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString: string, key: string) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  },
});

const token = { key: credentials.token, secret: credentials.tokenSecret };

// Make authenticated API request
async function apiRequest(params: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const requestData = { url: url.toString(), method: 'GET' };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      'Authorization': authHeader['Authorization'],
      'User-Agent': 'GitHub-Action-UpdateCommons/1.0 User:DaxServer',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Make POST request with OAuth authorization
async function apiPostRequest(params: Record<string, string>, data: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const formData = new URLSearchParams(data);

  const requestData = { url: url.toString(), method: 'POST', data: data };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      'Authorization': authHeader['Authorization'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GitHub-Action-UpdateCommons/1.0 User:DaxServer',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`API POST request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main(): Promise<void> {
  try {
    console.log('Getting CSRF token...');

    // Get CSRF token
    const tokenResponse: TokenResponse = await apiRequest({
      action: 'query',
      meta: 'tokens',
      format: 'json',
    });

    if (tokenResponse.error) {
      console.error('Error getting token:', tokenResponse.error);
      process.exit(1);
    }

    const csrfToken = tokenResponse.query.tokens.csrftoken;
    console.log('CSRF token obtained');

    const content: string = await Bun.file(localFile).text();

    // Edit the page
    console.log('Updating page on Commons...');
    const editResponse: EditResponse = await apiPostRequest(
      {
        action: 'edit',
        title: pageTitle,
        format: 'json',
      },
      {
        text: content,
        summary: 'Update from GitHub (via OAuth automation)',
        token: csrfToken,
      }
    );

    if (editResponse.error) {
      console.error('Error editing page:', editResponse.error);
      process.exit(1);
    }

    if (editResponse.edit) {
      console.log('✓ Page updated successfully!');
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
