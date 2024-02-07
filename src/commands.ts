import * as vscode from 'vscode';
import { ERRORS, INFORMATION } from './consts';
import { errors } from './extension';
import { ICommand, commandsEnum } from './types';
import { homedir } from 'os';

// const { execSync } = require('child_process');
import { exec } from 'child_process';

// Run program or script
export function runProgram([program]: any) {
    exec(program, { shell: 'true' }, (err: any, data: any) => {
        console.log({ err });
        console.log(data.toString());
    });
}


// Open file
export function openFile(args: any) {

    console.log('args: ', JSON.stringify(args));

    let path: string = args ?? '';

    if (typeof path === 'string' && path.startsWith('~/'))
        path = path.replace('~', homedir());

    console.log(process.platform);
    console.log(path);

    const uri = vscode.Uri.file(path);
    vscode.commands.executeCommand('vscode.open', uri);

    // const projectPath: string = vscode.workspace.rootPath || '';

    // let document: string;

    // if (args[1] !== 'external' && !!projectPath) {
    //     document = process.platform === 'win32' ? `${projectPath}\\${args[0]}` : `${projectPath}/${args[0]}`;
    // } else {
    //     document = args[0];
    // }

    // vscode.workspace.openTextDocument(document).then(
    //     (doc) => {
    //         vscode.window.showTextDocument(doc);
    //     },
    //     () => {
    //         vscode.window.showErrorMessage(`${ERRORS.FILE_NOT_FOUND}: ${document}`);
    //     }
    // );
}

export function openFolder(payload: any, newWindow = false) {
    // const projectPath: string = vscode.workspace.rootPath || '';
    console.log('args: ', JSON.stringify(payload));

    let path: string = payload?.command?.arguments ?? '';

    if (typeof path === 'string' && path.startsWith('~/'))
        path = path.replace('~', homedir());

    console.log(process.platform);
    console.log(path);

    const uri = vscode.Uri.file(path);
    vscode.commands.executeCommand('vscode.openFolder', uri, newWindow);

    // if (args[1] !== 'external' && !!projectPath) {
    //     document = process.platform === 'win32' ? `${projectPath}\\${args[0]}` : `${projectPath}/${args[0]}`;
    // } else {
    //     document = args[0];
    // }

    // vscode.workspace.openTextDocument(document).then(
    //     (doc) => {
    //         vscode.window.showTextDocument(doc);
    //     },
    //     () => {
    //         vscode.window.showErrorMessage(`${ERRORS.FILE_NOT_FOUND}: ${document}`);
    //     }
    // );

    // openFolder(newWindow = false) {
    //     const uri = vscode.Uri.file(this.absoluteFolderPath)
    //     vscode.commands.executeCommand('vscode.openFolder', uri, newWindow)
    // }
}

// Run VSCode command
export function runCommand(args: any) {
    const [command, ...rest] = args;
    switch (command) {
        case '':
            errors.add(ERRORS.COMMAND_NOT_FOUND);
            break;
        case 'vscode.openFolder':
            if (!rest[0]) {
                errors.add(ERRORS.COMMAND_NOT_FOUND);
            }
            vscode.commands.executeCommand(command, vscode.Uri.file(rest[0]));
            break;
        case 'vscode.open':
            if (!rest[0]) {
                errors.add(ERRORS.COMMAND_NOT_FOUND);
            }
            vscode.commands.executeCommand(command, vscode.Uri.parse(rest[0]));
            break;
        default:
            vscode.commands.executeCommand(command, ...rest);
    }

    errors.show();
}

// Add code to file
export function insertNewCode(args: any) {
    const [file, searchPattern, newCode, action = 'before'] = args;
    const projectPath: string = vscode.workspace.rootPath || '';
    const document: string = `${projectPath}\\${file}`;
    vscode.workspace.openTextDocument(document).then(
        (doc) => {
            vscode.window.showTextDocument(doc).then(() => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const regexp = action === 'replaceAll' ? new RegExp(searchPattern, 'g') : new RegExp(searchPattern);
                    const fullText = editor.document.getText();
                    const index = fullText.search(regexp);
                    const searchedText = (fullText.match(regexp) || [])[0];
                    const positionStart = editor.document.positionAt(index);
                    const positionEnd = editor.document.positionAt(index + (searchedText?.length || 0));
                    switch (action) {
                        case 'replace':
                            const range = new vscode.Range(positionStart, positionEnd);
                            editor.edit((editBuilder) => {
                                editBuilder.replace(range, newCode);
                            });
                            break;
                        case 'replaceAll':
                            const matchAll = Array.from(fullText.matchAll(regexp));
                            editor.edit((editBuilder) => {
                                matchAll.forEach((item) => {
                                    const searchedText = item[0]?.length;
                                    const positionStart = editor.document.positionAt(Number(item.index));
                                    const positionEnd = editor.document.positionAt(Number(item.index) + searchedText);
                                    const range = new vscode.Range(positionStart, positionEnd);
                                    editBuilder.replace(range, newCode);
                                });
                            });
                            break;
                        case 'after':
                            errors.add(ERRORS.COMMAND_NOT_SUPPORTED_YET);
                            break;
                        case 'before':
                        default:
                            editor.edit((editBuilder) => {
                                editBuilder.insert(positionStart, newCode);
                            });
                    }
                }
            });
        },
        () => {
            errors.add(`${ERRORS.FILE_NOT_FOUND}: ${document}`);
        }
    );

    errors.show();
}

// Run Sequence.
export function runSequence(args: ICommand[]) {
    args?.forEach((item) => {
        switch (item.command) {
            case commandsEnum.openFile:
                openFile(item.arguments);
                // case 'openFolder':
                //     runCommand(item.arguments);
                break;
            case commandsEnum.run:
                runProgram(item.arguments?.[0]);
                break;
            case commandsEnum.runCommand:
                runCommand(item.arguments);
                break;
            case commandsEnum.insertNewCode:
                insertNewCode(item.arguments);
                break;
            default:
                vscode.window.showInformationMessage('This command is not supported in Sequence');
        }
    });
}
