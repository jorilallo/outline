// @flow
import fs from "fs";
import File from "formidable/lib/file";
import mammoth from "mammoth";
import quotedPrintable from "quoted-printable";
import TurndownService from "turndown";
import utf8 from "utf8";
import uuid from "uuid";
import parseTitle from "../../shared/utils/parseTitle";
import { FileImportError, InvalidRequestError } from "../errors";
import { Attachment, Event, User } from "../models";
import dataURItoBuffer from "../utils/dataURItoBuffer";
import parseImages from "../utils/parseImages";
import { uploadToS3FromBuffer } from "../utils/s3";

// https://github.com/domchristie/turndown#options
const turndownService = new TurndownService({
  hr: "---",
  bulletListMarker: "-",
  headingStyle: "atx",
});

interface ImportableFile {
  type: string;
  getMarkdown: (file: any) => Promise<string>;
}

const importMapping: ImportableFile[] = [
  {
    type: "application/msword",
    getMarkdown: confluenceToMarkdown,
  },
  {
    type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    getMarkdown: docxToMarkdown,
  },
  {
    type: "text/html",
    getMarkdown: htmlToMarkdown,
  },
  {
    type: "text/plain",
    getMarkdown: fileToMarkdown,
  },
  {
    type: "text/markdown",
    getMarkdown: fileToMarkdown,
  },
];

async function fileToMarkdown(file): Promise<string> {
  return fs.promises.readFile(file.path, "utf8");
}

async function docxToMarkdown(file): Promise<string> {
  const { value } = await mammoth.convertToHtml(file);
  return turndownService.turndown(value);
}

async function htmlToMarkdown(file): Promise<string> {
  const value = await fs.promises.readFile(file.path, "utf8");
  return turndownService.turndown(value);
}

async function confluenceToMarkdown(file): Promise<string> {
  let value = await fs.promises.readFile(file.path, "utf8");

  // We're only supporting the ridiculous output from Confluence here, regular
  // Word documents should call into the docxToMarkdown importer.
  // See: https://jira.atlassian.com/browse/CONFSERVER-38237
  if (!value.includes("Content-Type: multipart/related")) {
    throw new FileImportError("Unsupported Word file");
  }

  // get boundary marker
  const boundaryMarker = value.match(/boundary="(.+)"/);
  if (!boundaryMarker) {
    throw new FileImportError("Unsupported Word file (No boundary marker)");
  }

  // get content between multipart boundaries
  let boundaryReached = 0;
  const lines = value.split("\n").filter((line) => {
    if (line.includes(boundaryMarker[1])) {
      boundaryReached++;
      return false;
    }
    if (line.startsWith("Content-")) {
      return false;
    }

    // 1 == definition
    // 2 == content
    // 3 == ending
    if (boundaryReached === 2) {
      return true;
    }
    return false;
  });

  if (!lines.length) {
    throw new FileImportError("Unsupported Word file (No content found)");
  }

  // Mime attachment is "quoted printable" encoded, must be decoded first
  // https://en.wikipedia.org/wiki/Quoted-printable
  value = utf8.decode(quotedPrintable.decode(lines.join("\n")));

  // If we don't remove the title here it becomes printed in the document
  // body by turndown
  turndownService.remove(["style", "xml", "title"]);

  // Now we should have something that looks like HTML
  return turndownService.turndown(value);
}

export default async function documentImporter({
  file,
  user,
  ip,
}: {
  user: User,
  file: File,
  ip: string,
}): Promise<{ text: string, title: string }> {
  const fileInfo = importMapping.filter((item) => item.type === file.type)[0];
  if (!fileInfo) {
    throw new InvalidRequestError(`File type ${file.type} not supported`);
  }
  let title = file.name.replace(/\.[^/.]+$/, "");
  let text = await fileInfo.getMarkdown(file);

  // If the first line of the imported text looks like a markdown heading
  // then we can use this as the document title
  if (text.trim().startsWith("# ")) {
    const result = parseTitle(text);
    title = result.title;
    text = text.replace(`# ${title}\n`, "");
  }

  // find data urls, convert to blobs, upload and write attachments
  const images = parseImages(text);
  const dataURIs = images.filter((href) => href.startsWith("data:"));

  for (const uri of dataURIs) {
    const name = "imported";
    const key = `uploads/${user.id}/${uuid.v4()}/${name}`;
    const acl = process.env.AWS_S3_ACL || "private";
    const { buffer, type } = dataURItoBuffer(uri);
    const url = await uploadToS3FromBuffer(buffer, type, key, acl);

    const attachment = await Attachment.create({
      key,
      acl,
      url,
      size: buffer.length,
      contentType: type,
      teamId: user.teamId,
      userId: user.id,
    });

    await Event.create({
      name: "attachments.create",
      data: { name },
      teamId: user.teamId,
      userId: user.id,
      ip,
    });

    text = text.replace(uri, attachment.redirectUrl);
  }

  return { text, title };
}
