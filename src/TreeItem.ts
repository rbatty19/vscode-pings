import * as vscode from 'vscode';
import * as fs from 'fs';
import * as shortUUID from 'short-uuid';

export class TreeItem extends vscode.TreeItem {
    children: TreeItem[] | undefined;
    customColors: string[] = [];

    constructor(label: string, children?: TreeItem[], extra?: TreeItem | any) {
        super(label, children === undefined ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
        this.children = children;
        this.description = extra?.description;
        this.tooltip = extra?.description;
        this.contextValue = extra?.contextValue ?? '';
        this.id = extra?.id ?? shortUUID.generate();
        if (extra?.command) this.command = extra?.command;
        if (extra?.customIconReference) this.resourceUri = vscode.Uri.file(extra?.customIconReference);
        if (extra?.iconData) this.iconPath = extra?.iconData;
    }


    static async handleIconPath({ id, color }: { id?: string, color?: string }, command?: string): Promise<any> {

        let colorId;
        const getConfig = (section?: string) => {
            return vscode.workspace.getConfiguration(section);
        };

        // const themeColorValue = () => {
        //     return getConfig().inspect('workbench.colorTheme')?.globalValue ?? getConfig().inspect('workbench.colorTheme')?.workspaceValue;
        // };

        // const a1 = getConfig('workbench.colorTheme').get<string>('colorTheme');
        // const colorTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme') ?? 'Default Dark';
        // const themeElement: any = {};

        // const colorThemes: any[] = vscode.extensions.all
        //     .filter(extension => extension.packageJSON.contributes?.themes && extension.packageJSON.contributes?.themes.some((theme: any) => {
        //         if (theme.id === colorTheme) Object.assign(themeElement, theme);
        //         return theme.id === colorTheme;
        //     }));
        // .filter(extension => extension.packageJSON.contributes?.themes.some())
        // .map(extension => extension?.isActive());

        // const bracketHighlightColor = vscode.workspace
        //     .getConfiguration().get<string>('editorBracketHighlight.foreground4');

        // const data1 = vscode.Uri.joinPath(colorThemes[0].extensionUri, themeElement.path);

        // const data2 = JSON.parse(fs.readFileSync(data1.path, 'utf8'));

        if (color) {
            const existingColorCustomizations = getConfig().inspect('workbench.colorCustomizations')?.workspaceValue || getConfig().inspect('workbench.colorCustomizations')?.globalValue || {};

            colorId = `pings.custom_color-${color.split('#').pop()}`;
            await getConfig().update('workbench.colorCustomizations', {
                ...existingColorCustomizations,
                [colorId]: color
            }, vscode.ConfigurationTarget.Global);
        }

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

        // let colorObj: any = new vscode.ThemeColor(color ?? '');
        let colorObj: any = new vscode.ThemeColor(colorId ?? '');
        if (colorId) return (id && themeIcon(id, colorObj)) || getIcon(command, colorObj);

        return (id && themeIcon(id)) || getIcon(command);
    }
}
