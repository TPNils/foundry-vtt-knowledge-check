import { staticValues } from './static-values.js';
import { provider } from './provider.js';

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
    Hooks.once('socketlib.ready', () => HookManager.socketlibReady());
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
              ability.showImg = event.target.checked;
              ability.hideOriginalName = !event.target.checked;
              ability.showHtmlDescription = event.target.checked;
              ability.checked = event.target.checked;
              ability.revealed = event.target.checked;
            }
          }
  
          provider.getIdentifiable().setRevealed(game.actors.get(actorId).items.get(ownedItemId), event.target.checked);
          provider.getIdentifiable().updateAbilityMessage(messageId, actorId, {abilities: abilities});
        }
      }
  
    });

    const clickedOnClass = (event: Event, className: string) => {
      let target = event.target as HTMLElement;
      do {
        if (target.classList.contains(className)) {
          return target;
        } else {
          target = target.parentNode as HTMLElement;
        }
      } while (target.parentNode);

      return null;
    };

    // Add a listener to show the description of revealed abilities
    document.querySelector('#chat').addEventListener('click', async event => {
      if (event.target instanceof HTMLElement) {
        const matchedElement = clickedOnClass(event, 'knowledge-check-toggle-description');
        if (matchedElement) {
          let descriptionElement: HTMLElement;
          let currentElement = matchedElement;
          // The next (max)5 or so elements should be the description
          for (let i = 0; i < 5; i++) {
            currentElement = currentElement.nextElementSibling as HTMLElement;
            if (currentElement.classList.contains('knowledge-check-description')) {
              descriptionElement = currentElement;
              break;
            }
          }

          if (!descriptionElement) {
            return;
          }

          if (descriptionElement.style.display === 'none') {
            descriptionElement.style.display = 'block';
          } else {
            descriptionElement.style.display = 'none';
          }
        }
      }
    });
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
        const currentSettings = provider.getIdentifiable().getItemSettings(item);
        await provider.getIdentifiable().setItemSettings(item, {
          ...currentSettings,
          isIdentifiable: !currentSettings.isIdentifiable
        });
        document.querySelectorAll(`.${staticValues.moduleName}-toggle-identifiable i`).forEach(icon => {
          icon.className = HookManager.getItemSheetHeaderButtonIcon(item);
        });
      }
    });

    // open settings with right click
    setTimeout(() => {
      document.querySelectorAll(`.${staticValues.moduleName}-toggle-identifiable:not(.${staticValues.moduleName}-has-context-listener)`).forEach(element => {
        element.classList.add(`${staticValues.moduleName}-has-context-listener`);
        element.addEventListener('contextmenu', async () => {
          provider.getIdentifiable().openSettings(item);
        });
      });
    }, 500);
  }

  private static getItemSheetHeaderButtonIcon(item: Item<any>): string {
    return provider.getIdentifiable().getItemSettings(item).isIdentifiable ? 'fas fa-check-circle' : 'fas fa-times-circle';
  }

}