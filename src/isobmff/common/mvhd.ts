import { Reader } from "../../reader";
import { scrollTo } from "../utils";

export async function readCreationDate(reader: Reader) {
  let box = await scrollTo(reader, "moov");
  if (!box) {
    return undefined;
  }

  box = await scrollTo(reader, "mvhd");
  if (!box) {
    return undefined;
  }
  reader.incrementOffset(4);
  const time = await reader.readUnsignedInteger(4);
  let result = {
    creationDate: new Date((time - 2082844800) * 1000),
  };
  reader.incrementOffset(box.size - 8);
  return result;
}
