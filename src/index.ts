import fs from "fs/promises";
import { BufferReader, FileReader, Reader } from "./reader";
import { parseEssentials as parseEssentialsFromJpeg } from "./jpeg";
import { parseEssentials as parseEssentialsFromTiff } from "./tiff";
import { parseEssentials as parseEssentialsFromIsobmff } from "./isobmff";
import { parseEssentials as parseEssentialsFromExif } from "./exif";

export { Essentials } from "./essentials";

export async function getEssentials(filePath: string) {
  const { essentials } = await getEssentialsAndHeader(filePath);
  return essentials;
}

export async function getEssentialsAndHeader(
  filePath: string,
  headerLength = 8
) {
  let file;
  try {
    file = await fs.open(filePath);
    const reader = new FileReader(file);
    const header = new BufferReader(await reader.readBuffer(headerLength));
    const parser = await guessParser(header);
    reader.setOffset(0);
    const essentials = parser ? await parser(reader) : undefined;
    header.setOffset(0);
    return {
      essentials,
      header: (await header.readBuffer(headerLength)).toString("hex"),
    };
  } finally {
    if (file) {
      await file.close();
    }
  }
}

async function guessParser(header: BufferReader) {
  let n = await header.readUnsignedInteger(2);
  if (n === 0xffd8) {
    return parseEssentialsFromJpeg;
  }

  header.setOffset(0);
  let s = await header.readAsciiString(2);
  if (s === "MM" || s === "II") {
    // nef and cr2 are tiff
    // http://lclevy.free.fr/nef/
    // http://lclevy.free.fr/cr2/
    return parseEssentialsFromTiff;
  }

  header.setOffset(0);
  s = await header.readAsciiString(4);
  if (s === "Exif") {
    return parseEssentialsFromExif;
  }

  header.setOffset(4);
  s = await header.readAsciiString(4);
  if (s === "ftyp") {
    // mov, mp4
    return parseEssentialsFromIsobmff;
  }
}
