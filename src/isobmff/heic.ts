import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { scrollTo } from "./utils";

export async function parse(reader: Reader) {
  let result: Essentials | undefined;

  let box = await scrollTo(reader, "meta");
  if (!box) {
    return result;
  }

  box = await scrollTo(reader, "iinf");
  if (!box) {
    return result;
  }

  return result;
}
