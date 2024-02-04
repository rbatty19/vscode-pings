import * as vscode from 'vscode';
import { generate } from 'short-uuid';

export class TreeItem extends vscode.TreeItem {
    children: TreeItem[] | undefined;

    constructor(label: string, children?: TreeItem[], extra?: TreeItem | any) {
        super(label, children === undefined ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
        this.children = children;

        this.description = extra?.description;
        this.tooltip = extra?.description;
        this.contextValue = extra?.contextValue ?? '';
        this.id = extra?.id ?? generate();
        if (extra?.command) this.command = extra?.command;
        if (extra?.fsPath) this.resourceUri = vscode.Uri.file(extra?.fsPath);
        // else this.iconPath = extra?.iconPath;
        if (extra?.iconPath) this.iconPath = extra?.iconPath;
        // vscode.extensions.getExtension()
        // Object.assign(this.extras, { id: extra?.id });
        // this.resourceUri = vscode.extensions.getExtension('PKief.material-icon-theme')?.extensionUri; //vscode.workspace.getConfiguration().inspect('workbench.iconTheme')?.globalValue
    }
}
