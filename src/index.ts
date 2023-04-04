import fs from "fs/promises";
import { FileReader } from "./reader";
import { parseEssentials as parseEssentialsFromIsobmff } from "./isobmff";
import { parseEssentials as parseEssentialsFromJpeg } from "./jpeg";

export async function getEssentials(filePath: string) {
  let file;
  try {
    file = await fs.open(filePath);
    const reader = new FileReader(file);
    return await guessParser(filePath)(reader);
  } finally {
    if (file) {
      file.close();
    }
  }
}

function guessParser(filePath: string) {
  const lowercasedFilePath = filePath.toLowerCase();
  if (
    lowercasedFilePath.endsWith(".jpg") ||
    lowercasedFilePath.endsWith(".jpeg")
  ) {
    return parseEssentialsFromJpeg;
  } else {
    return parseEssentialsFromIsobmff;
  }
}
