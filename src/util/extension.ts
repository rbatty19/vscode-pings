import * as fs from 'fs';
import * as JSONC from 'jsonc-parser';
import { TCommand } from '../types';
import { PLUGIN_NAME } from '../consts';

/**
 * Get commands from file.
 * @param file full path with filename.
 */
export const getCommandsFromFile = (file: string): TCommand[] => {
  try {
    if (file && fs.existsSync(file)) {

      const json = file.endsWith('.jsonc')
        ? JSONC.parse(fs.readFileSync(file, 'utf8'))
        : JSON.parse(fs.readFileSync(file, 'utf8'));

      if (Array.isArray(json))
        return json;

      return json[`${PLUGIN_NAME}.commands`];
    }
  } catch {
    console.error(`${getCommandsFromFile.name}: Error`);
  }

  return [];
};

export function buildNodeChainById(id: string, commandsFromStore: TCommand[]) {
  // const commandsFromStore = getCommandsFromFile(store.globalStorageFilePath);
  let nodeChain: string[] = [];
  let globalItem: any;
  const searchIdItem = (item: any, index: number, indexes: string[] = []) => {
    indexes = [...indexes, `[${index}]`];
    if (item?.id === id) {
      nodeChain = indexes;
      globalItem = item;
      return true;
    }
    if (item.commands)
      item.commands.some((item: any, index: any) =>
        searchIdItem(item, index, [...indexes, `['commands']`])
      );

  };
  commandsFromStore.some((item, index) => searchIdItem(item, index));
  return { nodeChain, item: globalItem };
}