import * as vscode from 'vscode';

export class TreeItem extends vscode.TreeItem {
    children: TreeItem[] | undefined;

    constructor(label: string, children?: TreeItem[], extra?: TreeItem|Record<string, any>) {
        super(label, children === undefined ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
        this.children = children;
        this.iconPath = extra?.iconPath;
        this.description = extra?.description;
    }
}
