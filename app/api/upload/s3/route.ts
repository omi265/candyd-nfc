import { NextRequest, NextResponse } from "next/server";
import { uploadDirectToRailwayStorage } from "@/lib/storage";
import { validateMediaMetadata } from "@/lib/media-validation";
import { resolveUploadAuthorization } from "@/lib/upload-authorization";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  try {
    const guestToken = req.headers.get("x-candyd-guest-token") || undefined;
    const authorization = await resolveUploadAuthorization(guestToken);
    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const encodedFilename = req.headers.get("x-candyd-file-name");
    const contentType = req.headers.get("content-type") || "";
    const contentLength = Number(req.headers.get("x-candyd-file-size"));
    const transportLength = Number(req.headers.get("content-length"));
    if (!encodedFilename || !req.body) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = validateMediaMetadata(contentType, contentLength);
    if (!validation.valid) {
      const status = validation.error.includes("smaller") ? 413 : 415;
      return NextResponse.json({ error: validation.error }, { status });
    }
    if (Number.isFinite(transportLength) && transportLength !== contentLength) {
      return NextResponse.json({ error: "File size does not match request body" }, { status: 400 });
    }

    const filename = decodeURIComponent(encodedFilename);
    const body = Readable.fromWeb(req.body as import("stream/web").ReadableStream);
    const publicUrl = await uploadDirectToRailwayStorage(
      filename,
      contentType,
      body,
      authorization.scope,
      contentLength
    );

    const resourceType = contentType.startsWith("video")
      ? "video"
      : contentType.startsWith("audio")
      ? "audio"
      : "image";

    return NextResponse.json({
      secure_url: publicUrl,
      resource_type: resourceType,
      bytes: contentLength,
    });
  } catch (error: unknown) {
    console.error("S3 upload route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
