import { staticValues } from "./static-values.js";
import { SystemManager } from "./system-manager.js";

interface ItemSheetHeaderButton {
  class: string;
  icon: string;
  label: string;
  onclick: (event: MouseEvent) => void
}

export class HookManager {
  public static registerAll(): void {
    Hooks.on('getItemSheetHeaderButtons', (...args: any) => HookManager.getItemSheetHeaderButtons(args[0], args[1]));
    Hooks.on('init', () => HookManager.init());
    Hooks.on('ready', () => HookManager.ready());
  }

  private static init(): void {
    game[staticValues.moduleName] = {
      printAbilities: (actorId: string) => SystemManager.getIdentifiable().printAbilities(actorId)
    };
  }

  private static ready(): void {
    // Add a listener to detect clicking on the checkbox input
    document.querySelector('#chat').addEventListener('change', event => {
      if (event.target instanceof HTMLInputElement) {
        if (event.target.classList.contains('knowledge-check') && event.target.classList.contains('identifiable')) {
          let actorId: string;
          let ownedItemId: string;
          let messageId: string;
  
          let messageRoot: HTMLElement;
          let element: HTMLElement = event.target;
          while (element.parentElement && (!actorId || !ownedItemId || !messageRoot)) {
            if (!actorId && element.dataset.actorId) {
              actorId = element.dataset.actorId;
            }
            if (!ownedItemId && element.dataset.ownedItemId) {
              ownedItemId = element.dataset.ownedItemId;
            }
            if (!messageId && element.dataset.messageId) {
              messageId = element.dataset.messageId;
              messageRoot = element;
            }
            element = element.parentElement;
          }
  
          if (!actorId || !ownedItemId || !messageId) {
            return;
          }
  
          event.target.setAttribute('checked', "");
          messageRoot.querySelectorAll('input').forEach(element => {
            element.disabled = true;
          });
  
          SystemManager.getIdentifiable().setRevealed(game.actors.get(actorId).items.get(ownedItemId), true);
          ChatMessage.update({
            _id: messageId,
            content: messageRoot.querySelector('.message-content').innerHTML
          });
        }
      }
  
    })
  }

  private static getItemSheetHeaderButtons(app: any, buttons: ItemSheetHeaderButton[]): void {
    if (!game.user.hasRole(CONST.USER_ROLES.ASSISTANT)) {
      return;
    }
    const item: Item<any> = app.item;
    buttons.unshift({
      class: `${staticValues.moduleName}-toggle-identifiable`,
      icon: HookManager.getItemSheetHeaderButtonIcon(item),
      label: 'Identifiable',
      onclick: async () => {
        await SystemManager.getIdentifiable().setIdentifiable(item, !SystemManager.getIdentifiable().isIdentifiable(item));
        document.querySelectorAll(`.${staticValues.moduleName}-toggle-identifiable i`).forEach(icon => {
          icon.className = HookManager.getItemSheetHeaderButtonIcon(item);
        });
      }
    })

    // reset with right click
    setTimeout(() => {
      document.querySelectorAll(`.${staticValues.moduleName}-toggle-identifiable:not(.${staticValues.moduleName}-has-context-listener)`).forEach(element => {
        element.classList.add(`${staticValues.moduleName}-has-context-listener`);
        element.addEventListener('contextmenu', async () => {
          await SystemManager.getIdentifiable().setIdentifiable(item, null);
          element.querySelectorAll(`:scope i`).forEach(icon => {
            icon.className = HookManager.getItemSheetHeaderButtonIcon(item);
          });
        })
      });
    }, 500);
  }

  private static getItemSheetHeaderButtonIcon(item: Item<any>): string {
    if (SystemManager.getIdentifiable().isManuallySet(item)) {
      return SystemManager.getIdentifiable().isIdentifiable(item) ? 'fas fa-check' : 'fas fa-times';
    } else {
      return SystemManager.getIdentifiable().isIdentifiable(item) ? 'fas fa-check-circle' : 'fas fa-times-circle';
    }
  }

}