import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { readCreationDate } from "./common/mvhd";
import { scrollTo } from "./utils";

export async function parse(reader: Reader): Promise<Essentials | undefined> {
  let result: Essentials | undefined;

  result = await readCreationDate(reader);
  if (!result) {
    return result;
  }

  let box = await scrollTo(reader, "meta");
  if (!box) {
    return result;
  }

  reader.incrementOffset(4); // meta flags

  box = await scrollTo(reader, "xml ");
  if (!box) {
    return result;
  }

  const xml = await reader.readUtf8String(box.size);
  const deviceTagOffset = xml.indexOf("<Device ");
  if (deviceTagOffset > -1) {
    const device = xml.slice(
      deviceTagOffset + 8,
      xml.indexOf("/>", deviceTagOffset)
    );
    const props = device.split(/\s+/).reduce((memo, p) => {
      const [key, value] = p.split("=");
      return {
        ...memo,
        [key]: value.trim().replace(/^"/, "").replace(/"$/, ""),
      };
    }, {}) as Record<string, string>;
    const camera = [props.manufacturer, props.modelName]
      .filter(Boolean)
      .join(" ");
    if (camera) {
      return { ...result, camera };
    }
  }

  return result;
}
