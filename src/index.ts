import fs from "fs/promises";
import { FileReader } from "./reader";
import { parseEssentials as parseEssentialsFromIsobmff } from "./isobmff";

export async function getEssentials(filePath: string) {
  let file;
  try {
    file = await fs.open(filePath);
    const reader = new FileReader(file);
    return await parseEssentialsFromIsobmff(reader);
  } finally {
    if (file) {
      file.close();
    }
  }
}
