import * as demoSettings from '../resources/demosettings.json';
import * as vscode from 'vscode';
import * as JSONC from 'jsonc-parser';
import * as fs from 'fs';
import * as path from 'path';
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

// get Icon
const getIcon = (item: any, color: string) => {
    const themeColor = new vscode.ThemeColor(color ?? '');
    switch (item.command) {
        case 'openFile':
            return new vscode.ThemeIcon('symbol-file', themeColor);
        case 'openFolder':
            return new vscode.ThemeIcon('symbol-folder', themeColor);
        case 'run':
            return new vscode.ThemeIcon('console', themeColor);
        case 'runCommand':
            return new vscode.ThemeIcon('run', themeColor);
        case 'insertNewCode':
            return new vscode.ThemeIcon('find-replace', themeColor);
        default:
            return vscode.ThemeIcon.File;
    }
};

// Get command from item of settings
const getCommand = (item: ICommandWithSequence) => {
    if (item.sequence) {
        return getSequence(item);
    }
    return {
        label: item.label,
        description: item.description,
        contextValue: item.command,
        command: {
            command: `${PLUGIN_NAME}.${item.command}`,
            arguments: ['openFolder'].includes(item.command ?? '') ? item?.path : [item.arguments],
        },
        iconPath:
            (item.icon && new vscode.ThemeIcon(item.icon, new vscode.ThemeColor(item.iconColor ?? ''))) ||
            getIcon(item, item.iconColor ?? ''),
    };
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

            if (Array.isArray(json)) {
                return json;
            }
            return json[`${PLUGIN_NAME}.commands`];
        }
    } catch {
        console.error(`${getCommandsFromFile.name}: Error`);
    }

    return [];
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
        workspaceFolders.forEach((filder) => {
            const vscodeFolder = process.platform === 'win32' ? '\\.vscode\\' : '/.vscode/';
            commands.push(...getCommandsFromFile(path.join(filder, `${vscodeFolder}${'pings.json'}`)));
            commands.push(
                ...getCommandsFromFile(path.join(filder, '.pings.json')),
                ...getCommandsFromFile(path.join(filder, 'pings.json'))
            );
        });
    }

    Object.assign(store, {
        commands: [...commands]
    });

    const commandsForTree = store.commands.length ? store.commands : (<any>demoSettings)[`${PLUGIN_NAME}.commands`];

    return commandsForTree.map((item: any) => {
        return itemRender(item);
    });
};

function itemRender(item: any) {
    if (item.commands) {
        const { label, commands, icon, iconColor, description } = item;
        return new TreeItem(
            label,
            commands.map((subItem: any) => itemRender(subItem)),
            {
                iconPath: (
                    icon && new vscode.ThemeIcon(icon, new vscode.ThemeColor(iconColor ?? ''))
                ) || getIcon(item, iconColor ?? ''),
                description
            }
        );
    }
    return getCommand(item);
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
    const storeUri = vscode.Uri.joinPath(globalStorageUri, 'ping.setting.jsonc');
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

    context.subscriptions.push(
        vscode.commands.registerCommand(`${PLUGIN_NAME}.openFile`, (args) => {
            openFile(args);
        }),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.openFolder`, (args) => {}),
        vscode.commands.registerCommand(`${PLUGIN_NAME}.run`, (args) => {
            runProgram(args[0]);
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
