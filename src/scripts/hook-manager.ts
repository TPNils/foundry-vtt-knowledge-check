import { staticValues } from "./static-values.js";
import { provider } from "./provider.js";

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
    Hooks.once("socketlib.ready", () => HookManager.socketlibReady());
  }

  private static init(): void {
    game[staticValues.moduleName] = {
      printAbilities: (actorId: string) => provider.getIdentifiable().printAbilities(actorId)
    };
  }

  private static ready(): void {
    // Add a listener to detect clicking on the checkbox input
    document.querySelector('#chat').addEventListener('change', async event => {
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
  
          const abilities = provider.getIdentifiable().getAbilitiesFromActor(actorId);
          for (const ability of abilities) {
            ability.disabled = true;
            if (ability.ownedItemId === ownedItemId) {
              ability.checked = true;
              // Do not set as revealed,
              // checked but not revealed implies that the user selected it in that message
            }
          }
  
          await provider.getIdentifiable().setRevealed(game.actors.get(actorId).items.get(ownedItemId), true);
          await provider.getIdentifiable().updateAbilityMessage(messageId, actorId, {abilities: abilities});
        }
      }
  
    })
  }

  private static socketlibReady(): void {
    provider.setSocket(socketlib.registerModule(staticValues.moduleName));
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
        await provider.getIdentifiable().setIdentifiable(item, !provider.getIdentifiable().isIdentifiable(item));
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
          await provider.getIdentifiable().setIdentifiable(item, null);
          element.querySelectorAll(`:scope i`).forEach(icon => {
            icon.className = HookManager.getItemSheetHeaderButtonIcon(item);
          });
        })
      });
    }, 500);
  }

  private static getItemSheetHeaderButtonIcon(item: Item<any>): string {
    if (provider.getIdentifiable().isManuallySet(item)) {
      return provider.getIdentifiable().isIdentifiable(item) ? 'fas fa-check' : 'fas fa-times';
    } else {
      return provider.getIdentifiable().isIdentifiable(item) ? 'fas fa-check-circle' : 'fas fa-times-circle';
    }
  }

}