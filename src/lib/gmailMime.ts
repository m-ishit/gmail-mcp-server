import type { gmail_v1 } from "googleapis";

export interface OutgoingMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function encodeHeaderValue(value: string): string {
  // Encode non-ASCII header values (e.g. subject lines) per RFC 2047.
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

export function buildRawMessage(msg: OutgoingMessage): string {
  const boundary = `----=_Boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const headers: string[] = [
    `To: ${msg.to.join(", ")}`,
    ...(msg.cc && msg.cc.length ? [`Cc: ${msg.cc.join(", ")}`] : []),
    ...(msg.bcc && msg.bcc.length ? [`Bcc: ${msg.bcc.join(", ")}`] : []),
    `Subject: ${encodeHeaderValue(msg.subject)}`,
    "MIME-Version: 1.0",
    ...(msg.inReplyTo ? [`In-Reply-To: ${msg.inReplyTo}`] : []),
    ...(msg.references ? [`References: ${msg.references}`] : []),
  ];

  let body: string;
  if (msg.bodyHtml) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body =
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
      `${msg.bodyText}\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
      `${msg.bodyHtml}\r\n\r\n` +
      `--${boundary}--`;
  } else {
    headers.push(`Content-Type: text/plain; charset="UTF-8"`);
    body = msg.bodyText;
  }

  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return base64UrlEncode(raw);
}

export interface DecodedBody {
  text?: string;
  html?: string;
}

export function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): DecodedBody {
  const result: DecodedBody = {};
  if (!payload) return result;

  function walk(part: gmail_v1.Schema$MessagePart): void {
    const mimeType = part.mimeType ?? "";
    const data = part.body?.data;
    if (data && mimeType === "text/plain" && !result.text) {
      result.text = base64UrlDecode(data);
    } else if (data && mimeType === "text/html" && !result.html) {
      result.html = base64UrlDecode(data);
    }
    for (const child of part.parts ?? []) {
      walk(child);
    }
  }

  walk(payload);
  return result;
}

export function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
}

export function extractAttachmentMeta(
  payload: gmail_v1.Schema$MessagePart | undefined
): Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> {
  const attachments: Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> = [];
  if (!payload) return attachments;

  function walk(part: gmail_v1.Schema$MessagePart): void {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType ?? "application/octet-stream",
        attachmentId: part.body.attachmentId,
        size: part.body.size ?? 0,
      });
    }
    for (const child of part.parts ?? []) {
      walk(child);
    }
  }

  walk(payload);
  return attachments;
}
