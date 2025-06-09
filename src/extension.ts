import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const TICK_KEY = 'tickedFiles';
  const COLOR_KEY = 'starColor';
  const stored = context.workspaceState.get<string[]>(TICK_KEY, []);
  const ticked = new Set<string>(stored);

  let badgeChar = context.workspaceState.get<string>('badgeChar', '★');
  let badgeColor = context.workspaceState.get<string>(COLOR_KEY, 'charts.yellow');

  const decoEmitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();

  const provider: vscode.FileDecorationProvider = {
    onDidChangeFileDecorations: decoEmitter.event,
    provideFileDecoration(uri: vscode.Uri) {
      if (ticked.has(uri.toString())) {
        return {
          tooltip: 'Ticked',
          badge: badgeChar,
          color: new vscode.ThemeColor(badgeColor)
        };
      }
      return undefined;
    }
  };

  context.subscriptions.push(vscode.window.registerFileDecorationProvider(provider));

  function refreshAll() {
    const uris = Array.from(ticked).map(s => vscode.Uri.parse(s));
    if (uris.length > 0) decoEmitter.fire(uris);
  }

  // Активируем декорации после загрузки workspace
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    refreshAll();
  } else {
    const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      refreshAll();
      disposable.dispose();
    });
  }

  function toggleTick(uri: vscode.Uri) {
    const key = uri.toString();
    if (ticked.has(key)) {
      ticked.delete(key);
    } else {
      ticked.add(key);
    }
    context.workspaceState.update(TICK_KEY, Array.from(ticked));
    decoEmitter.fire(uri);
  }

  async function setStyle() {
    const badgeInput = await vscode.window.showInputBox({
      prompt: 'Enter badge symbol (single character)',
      value: badgeChar,
      validateInput: text => text.length !== 1 ? 'Please enter exactly one character' : null
    });
    if (!badgeInput) {
      return;
    }
    const colorInput = await vscode.window.showInputBox({
      prompt: 'Enter badge color (ThemeColor ID, e.g. charts.yellow)',
      value: badgeColor,
      validateInput: text => text.trim() === '' ? 'Color cannot be empty' : null
    });
    if (!colorInput) {
      return;
    }
    badgeChar = badgeInput;
    badgeColor = colorInput;
    await context.workspaceState.update('badgeChar', badgeChar);
    await context.workspaceState.update(COLOR_KEY, badgeColor);
    refreshAll();
  }

  async function resetStyle() {
    badgeChar = '★';
    badgeColor = 'charts.yellow';
    await context.workspaceState.update('badgeChar', badgeChar);
    await context.workspaceState.update('starColor', badgeColor);
    refreshAll(); // Обновляем декорации
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('tick.toggleTick', toggleTick),
    vscode.commands.registerCommand('tick.setStyle', setStyle),
    vscode.commands.registerCommand('tick.resetStyle', resetStyle)
  );
}

export function deactivate() {}