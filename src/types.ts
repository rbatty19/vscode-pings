import * as vscode from 'vscode';

export interface IStore {
    commands: TCommand[];
    globalStorageFilePath: string;
}

export enum commandsEnum {
    openFile = 'openFile',
    openFolder = 'openFolder',
    run = 'run',
    runCommand = 'runCommand',
    insertNewCode = 'insertNewCode'
}

const commandsTypes = [...Object.values(commandsEnum)] as const;
export type commandType = typeof commandsTypes[number];

export type TCommand = (ICommand | ICommandWithSequence);

export interface IItem extends vscode.TreeItem {
    collapsibleState: number;
    label: string;
    version: string;
    command?: any;
    iconPath: any;
    iconColor?: string;
    contextValue?: string;
}

export interface ICommand {
    id: string;
    label: string;
    description?: string;
    icon?: 'file' | 'folder' | string;
    iconColor?: string;
    command?: commandType | string;
    commands?: TCommand[];
    fake_resoure_icon_ref?: string;
    arguments?: Array<any>;
    path?: Array<any>;
    options?: any;
}

export interface ICommandWithSequence {
    id?: string;
    label: string;
    description?: string;
    icon?: string;
    iconColor?: string;
    fake_resoure_icon_ref?: string;
    commands: TCommand[];
    sequence?: Array<ICommand>;
    command?: commandType | string;
    arguments?: Array<any>;
    path?: Array<any>;
    options?: any;
}
