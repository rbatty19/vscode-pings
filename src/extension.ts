import * as demoSettings from '../resources/demosettings.json';
import * as vscode from 'vscode';
import * as JSONC from 'jsonc-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as shortUUID from 'short-uuid';
import { PLUGIN_NAME } from './consts';
import { ICommandWithSequence, IStore, TCommand } from './types';
import { FavoritesPanelProvider } from './FavoritesPanelProvider';
import { TreeItem } from './TreeItem';
import { insertNewCode, openFile, openFolder, runCommand, runProgram, runSequence } from './commands';
import { Errors } from './Errors';

// initial store.
const store: IStore = {
    commands: [],
    globalStorageFilePath: ''
};

export const errors = new Errors();

const checkFileOrFolder = (pathFile: any) => {

    function currentPageUri() {
        return vscode.window.activeTextEditor
            && vscode.window.activeTextEditor.document
            && vscode.window.activeTextEditor.document.uri;
    }

    try {
        let uri;
        if (pathFile) {
            uri = pathFile?.fsPath;
        } else {
            const _path = currentPageUri();
            uri = _path && _path.fsPath;
        }

        const scheme = fs.lstatSync(uri).isDirectory() ? 'folder' : fs.lstatSync(uri).isFile() ? 'file' : 'unknown';
        return { scheme, uri };
    } catch {
        return {};
    }
};

// get Icon
const getIcon = (item: any, color?: string) => {
    switch (item.command) {
        case 'openFile':
            return vscode.ThemeIcon.File;
        case 'openFolder':
            return vscode.ThemeIcon.Folder;
        case 'run':
            return new vscode.ThemeIcon('console');
        case 'runCommand':
            return new vscode.ThemeIcon('run');
        case 'insertNewCode':
            return new vscode.ThemeIcon('find-replace');
        default:
            return new vscode.ThemeIcon('open-editors-view-icon');
    }
};

// Get command from item of settings
const getCommand = (item: ICommandWithSequence) => {
    if (item.sequence) {
        return getSequence(item);
    }

    const argsByCommand: Record<string, unknown> = {
        openFolder: item?.path,
        openFile: [item?.path],
    };

    const iconData = item.icon || item.iconColor ? { iconData: { id: item.icon, color: item.iconColor } } : {};

    return new TreeItem(
        item.label,
        // scheme === 'folder' ? [] : undefined,
        undefined,
        {
            ...iconData,
            description: item.description,
            fsPath: item?.path,
            command: {
                command: `${PLUGIN_NAME}.${item.command}`,
                arguments: argsByCommand[`${item!.command}`] ?? [item.arguments],
            },
            contextValue: item.command,
            id: item?.id ?? shortUUID.generate()
        }
    );
};

// Get Sequence from item of settings
const getSequence = (item: ICommandWithSequence) => {
    return {
        label: item.label,
        description: item.description,
        command: {
            command: `${PLUGIN_NAME}.runSequence`,
            arguments: [item.sequence],
        },
        iconPath:
            (item.icon && new vscode.ThemeIcon(item.icon, new vscode.ThemeColor(item.iconColor ?? ''))) ||
            getIcon(item, item.iconColor ?? ''),
        id: item?.id ?? shortUUID.generate()
    };
};

// Get Commands from configuration.
const getCommandsFromConf = (): TCommand[] => vscode.workspace.getConfiguration(PLUGIN_NAME).get('commands') || [];
const getCommandsFromWorkspaceConf = (): TCommand[] => vscode.workspace.getConfiguration(PLUGIN_NAME).get('commandsForWorkspace') || [];

// Get path to config file.
const getConfFilePath = (): string => vscode.workspace.getConfiguration(PLUGIN_NAME).get('configPath') || '';
const getWorkspaceConfFilePath = (): string => vscode.workspace.getConfiguration(PLUGIN_NAME).get('configPathForWorkspace') || '';

/**
 * Get commands from file.
 * @param file full path with filename.
 */
const getCommandsFromFile = (file: string): TCommand[] => {
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

export const writeNewCommandInGlobalStore = async ({ data, commandsStore }: any) => {

    const file = store.globalStorageFilePath;

    if (!(file && fs.existsSync(file))) {
        console.log('Global Store FILE does not exist');
        return;
    }

    if (!commandsStore) commandsStore = getCommandsFromFile(file);

    const newData = data ? [data] : [];

    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(file),
        Buffer.from(JSON.stringify({
            [`${PLUGIN_NAME}.commands`]: [...commandsStore, ...newData]
        }, null, 4), 'utf8')
    );

};

// Prepare commands for tree view.
export const getCommandsForTree = async (context: vscode.ExtensionContext) => {
    const workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri?.fsPath) || [];
    const commands: TCommand[] = [
        ...getCommandsFromFile(store.globalStorageFilePath),
        ...getCommandsFromConf(),
        ...getCommandsFromWorkspaceConf(),
        ...getCommandsFromFile(getConfFilePath()),
        ...getCommandsFromFile(getWorkspaceConfFilePath()),
    ];

    if (workspaceFolders.length) {
        workspaceFolders.forEach((folder) => {
            const vscodeFolder = process.platform === 'win32' ? '\\.vscode\\' : '/.vscode/';
            commands.push(...getCommandsFromFile(path.join(folder, `${vscodeFolder}${'pings.json'}`)));
            commands.push(
                ...getCommandsFromFile(path.join(folder, '.pings.json')),
                ...getCommandsFromFile(path.join(folder, 'pings.json'))
            );
        });
    }

    Object.assign(store, {
        commands: [...commands]
    });

    const commandsForTree = store.commands.length ? store.commands : (<any>demoSettings)[`${PLUGIN_NAME}.commands`];

    return commandsForTree.map(
        (item: any) => itemRender(item)
    );
};

function itemRender(item: any) {

    const { label, commands, icon, iconColor, description, id, path } = item;

    const argsByCommand: Record<string, unknown> = {
        openFolder: path,
        openFile: [path],
    };
    const command = item?.command ? {
        command: {
            command: `${PLUGIN_NAME}.${item.command}`,
            arguments: argsByCommand[`${item!.command}`] ?? [item.arguments],
        },
    } : {};

    const iconData = item.icon || item.iconColor ? { iconData: { id: icon, color: iconColor } } : {};

    return new TreeItem(
        label,
        item.commands ? commands.map((subItem: any) => itemRender(subItem)) : undefined,
        {
            ...iconData,
            ...command,
            description,
            ['item.command']: item.command,
            contextValue: item.command,
            id,
            fsPath: path,
        }
    );

    // return getCommand(item);
}

async function checkGlobalStoreFile(storeUri: vscode.Uri) {
    try {
        await vscode.workspace.fs.readFile(storeUri);
    } catch {
        await vscode.workspace.fs.writeFile(storeUri, Buffer.from(JSON.stringify(demoSettings, null, 4), 'utf8'));
        vscode.window.showTextDocument(storeUri, { preview: false, preserveFocus: false });
    }
    Object.assign(store, {
        globalStorageFilePath: storeUri.fsPath
    });
}

// Commands activations/
export async function activate(context: vscode.ExtensionContext) {

    const globalStorageUri = context.globalStorageUri;
    vscode.workspace.fs.createDirectory(globalStorageUri);
    const storeUri = vscode.Uri.joinPath(globalStorageUri, 'ping.setting.jsonc'); // TODO store the storeUri in some higher scope
    await checkGlobalStoreFile(storeUri);

    const favoritesPanelProvider = new FavoritesPanelProvider(getCommandsForTree(context), context);

    vscode.window.registerTreeDataProvider('pings', favoritesPanelProvider);
    vscode.window.registerTreeDataProvider('pingsExplorer', favoritesPanelProvider);

    vscode.commands.registerCommand(`${PLUGIN_NAME}.refreshPanel`, () => favoritesPanelProvider.refresh());

    vscode.commands.registerCommand(`${PLUGIN_NAME}.openUserJsonSettings`, () => {
        runCommand(['workbench.action.openSettingsJson']);
    });
    vscode.commands.registerCommand(`${PLUGIN_NAME}.openGlobalUserJsonSettings`, () => {
        vscode.window.showTextDocument(storeUri, { preview: false, preserveFocus: false });
    });
    vscode.commands.registerCommand(`${PLUGIN_NAME}.openWorkspaceJsonSettings`, () => {
        runCommand(['workbench.action.openWorkspaceSettingsFile']);
    });

    vscode.commands.registerCommand(`${PLUGIN_NAME}.ShowInfo`, (item) => {
        vscode.window.showInformationMessage(`running AddFileToGlobalStore ${JSON.stringify({ item }, null, 2)}`);
    });

    vscode.commands.registerCommand(`${PLUGIN_NAME}.AddFileToGlobalStore`, async (pathFile) => {

        const { scheme, uri } = checkFileOrFolder(pathFile);

        await writeNewCommandInGlobalStore({
            data: {
                id: shortUUID.generate(),
                label: path.basename(uri),
                path: uri,
                icon: scheme === 'folder' ? 'folder' : 'file',
                description: path.basename(uri),
                command: scheme === 'folder' ? 'openFolder' : 'openFile',
            }
        });

        vscode.commands.executeCommand(`${PLUGIN_NAME}.refreshPanel`);
        vscode.commands.executeCommand(`${PLUGIN_NAME}.focus`);

        vscode.window.showInformationMessage(`running AddFileToGlobalStore ${JSON.stringify({ pathFile })}`);
    });

    vscode.commands.registerCommand(`${PLUGIN_NAME}.MoveItemToGroup`, async (item) => {

        // if (!item?.id) {
        //     vscode.window.showWarningMessage(`This Item doesn't have "id"`);
        //     return;
        // }

        const { nodeChain: currentItemChain, item: itemToMove } = buildNodeChainById(item?.id);

        if (!currentItemChain?.length) {
            vscode.window.showWarningMessage(`This Item doesn't have "id" or chain`);
            return;
        }

        const parentChain = (currentItemChain.length > 2)
            ? [...currentItemChain].slice(0, currentItemChain.length - 1)
            : [];

        const commandsFromStore = getCommandsFromFile(store.globalStorageFilePath);

        const roots: unknown[] = [];

        function rootAnalyzer(item: any, root: string[] = [], extra: any) {
            const { label, commands, description } = item;
            const currentRoot: any = [...root, label];
            if ((item.commands || item.command === 'openFolder')
                // && (extra.chain.join('') !== parentChain!.join(''))
                && (extra.chain.join('') !== `${currentItemChain.join('')}['commands']`)
            ) {
                roots.push({
                    path: currentRoot.join(' → '),
                    description,
                    label,
                    chain: extra.chain,
                    indexes: extra.indexes,
                    size: item.commands ? item.commands.length : 'empty'
                });
                if (item.commands)
                    commands.forEach((subItem: any, index: number) =>
                        rootAnalyzer(subItem, currentRoot, {
                            chain: [...extra.chain, `[${index}]`, `['commands']`],
                            indexes: [...extra.indexes, index],
                        })
                    );
            }
        }
        commandsFromStore.forEach((item: any, index) => rootAnalyzer(item, [], {
            chain: [`[${index}]`, `['commands']`],
            index,
            indexes: [index]
        }));

        // vscode.window.showInformationMessage(`currenItemChain ${JSON.stringify(currentItemChain, null, 2)}`);

        const baseRootItem = currentItemChain.length >= 2 ? [{
            label: 'base',
            key: -1,
            description: 'root',
            chain: [],
            size: commandsFromStore.length
        }] : [];

        const pickedCommand = await vscode.window.showQuickPick([...baseRootItem, ...roots.map(({ chain, size, ...item }: any, key) => ({
            label: item.path,
            key,
            // description: `${chain.join('')}: ${description}`,
            // description: `${JSON.stringify(item.indexes)} : ${item.description}`,
            description: `${item.description}`,
            chain,
            size
        }))], {
            title: `Select the new location:`,
        });

        const tempData = commandsFromStore;
        const tempStoreName = Object.keys({ tempData }).pop();

        // vscode.window.showWarningMessage(`pickedCommand?.chain.length (b): ${pickedCommand?.chain.length}`);

        const isPickedBase = pickedCommand?.chain.length < 2;

        // vscode.window.showWarningMessage(`pickedCommand.chain: ${pickedCommand?.chain.join('')}`);

        if (pickedCommand?.chain.join('').endsWith("['commands']")) pickedCommand?.chain.pop();

        // vscode.window.showWarningMessage(`tempData${pickedCommand?.chain.join('')}`);

        const result = eval(`${tempStoreName}${pickedCommand?.chain.join('')}`);

        // vscode.window.showWarningMessage(`result ${JSON.stringify(result, null, 2)}`);

        if (!isPickedBase && !result?.['commands']) Object.assign(result, { commands: [] });

        // vscode.window.showWarningMessage(`result?.['commands'].length ${JSON.stringify(result?.['commands'].length, null, 2)}`);
        // vscode.window.showWarningMessage(`result?.length ${JSON.stringify(result?.length, null, 2)}`);
        // vscode.window.showWarningMessage(`result ${JSON.stringify(result, null, 2)}`);

        if (result?.['commands']) {
            // vscode.window.showWarningMessage(`is here`);
            result?.['commands'].splice(result?.['commands'].length, 0, itemToMove);
        } else
            result.splice(result?.length, 0, itemToMove);

        const [last] = JSON.parse(currentItemChain.pop()!);
        const reff = eval(`${tempStoreName}${currentItemChain.join('')}`);

        reff.splice(last, 1);

        await writeNewCommandInGlobalStore({ commandsStore: tempData });

        vscode.commands.executeCommand(`${PLUGIN_NAME}.refreshPanel`);
    });

    function buildNodeChainById(id: string) {
        const commandsFromStore = getCommandsFromFile(store.globalStorageFilePath);
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

    context.subscriptions.push(
        vscode.commands.registerCommand(`${PLUGIN_NAME}.openFile`, (args) => {
            openFile(args);
        }),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.openFolder`, (args) => { }),

        vscode.commands.registerCommand(`${PLUGIN_NAME}.run`, (args) => {
            console.log('args', args);
            runProgram(args);
        }),

        vscode.commands.registerCommand(`${PLUGIN_NAME}.runCommand`, (args) => {
            runCommand(args);
        }),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.insertNewCode`, (args) => {
            insertNewCode(args);
        }),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.runSequence`, (args) => {
            runSequence(args);
        }),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.openFolderInWindow`, (args) =>
            openFolder(args)
        ),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.openFolderInNewWindow`, (args) =>
            openFolder(args, true)
        )
    );


    // // Open demo file of settings
    // if (!store.commands.length) {
    //     const path = process.platform === 'win32' ? '\\resources\\' : '/resources/';
    //     openFile([`${context.extensionPath}${path}demosettings.json`, 'external']);
    // }
}

export function deactivate() { }
