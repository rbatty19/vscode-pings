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
        if (extra?.iconData) this.iconPath = this.#handleIconPath(extra?.iconData, extra['item.command']);
        // vscode.extensions.getExtension()
        // Object.assign(this.extras, { id: extra?.id });
        // this.resourceUri = vscode.extensions.getExtension('PKief.material-icon-theme')?.extensionUri; //vscode.workspace.getConfiguration().inspect('workbench.iconTheme')?.globalValue
    }

    #handleIconPath({ id, color }: { id?: string, color?: string }, command?: string): any {

        // const getConfig = (section?: string) => {
        //     return vscode.workspace.getConfiguration(section);
        // };

        // const themeColorValue = () => {
        //     return getConfig().inspect('workbench.colorTheme')?.globalValue ?? getConfig().inspect('workbench.colorTheme')?.workspaceValue;
        // };

        // const a1 = getConfig('workbench.colorTheme').get<string>('colorTheme');

        const themeIcon = (id: string, color?: vscode.ThemeColor): vscode.ThemeIcon => color
            ? new vscode.ThemeIcon(id, color)
            : new vscode.ThemeIcon(id);

        const getIcon = (command?: string, color?: vscode.ThemeColor) => {

            switch (command) {
                case 'openFile':
                    return vscode.ThemeIcon.File;
                case 'openFolder':
                    return vscode.ThemeIcon.Folder;
                case 'run':
                    return themeIcon('console', color);
                case 'runCommand':
                    return themeIcon('run', color);
                case 'insertNewCode':
                    return themeIcon('find-replace', color);
                default:
                    return themeIcon('open-editors-view-icon', color);
            }
        };

        let colorObj: any = new vscode.ThemeColor(color ?? '');
        // if (!colorObj?.id) return (id && themeIcon(id)) || getIcon(command);

        return (id && themeIcon(id, colorObj)) || getIcon(command);
    }
}
