import { provider } from './provider.js';
import { staticValues } from './static-values.js';

export interface IdentifiableAbility {
  actorId: string;
  ownedItemId: string;
  name: string;
  img: string;
  htmlDescription: string;
  hideOriginalName: boolean;
  unidentifiedName: string;
  showHtmlDescription: boolean;
  showImg: boolean;
  revealed: boolean;
  checked: boolean;
  disabled: boolean;
}

export interface IdentifiableItemSetting {
  isIdentifiable: boolean;
  isIdentified: boolean;
  unidentifiedName?: string;
}

export type ItemId = Item | {
  actorId?: string;
  itemId: string;
};

export class Identifiable {

  public registerSocket(socket: SocketlibSocket): void {
    socket.register('updateAbilityMessage', this.updateAbilityMessageLocal.bind(this));
    socket.register('setRevealed', this.setRevealedLocal.bind(this));
  }

  public getItemSettings(itemId: ItemId): IdentifiableItemSetting {
    const item = this.getItem(itemId);
    const storedSettings: Partial<IdentifiableItemSetting> = item.getFlag(staticValues.moduleName, 'identifiable');
    const resultSettings: IdentifiableItemSetting = {
      isIdentifiable: storedSettings?.isIdentifiable === true,
      isIdentified: storedSettings?.isIdentified === true
    };
    if (storedSettings?.unidentifiedName != null) {
      resultSettings.unidentifiedName = storedSettings.unidentifiedName;
    }
    return resultSettings;
  }

  public async setItemSettings(itemId: ItemId, value: IdentifiableItemSetting): Promise<void> {
    const item = this.getItem(itemId);
    if (value == null) {
      await item.unsetFlag(staticValues.moduleName, 'identifiable');
    } else {
      await item.setFlag(staticValues.moduleName, 'identifiable', value);
    }
  }

  public async setRevealed(item: Item<any>, value: boolean): Promise<void> {
    const socket = await provider.getSocket();
    return await socket.executeAsGM('setRevealed', item.actor.id, item.id, value);
  }

  private async setRevealedLocal(actorId: string, itemId: string, value: boolean): Promise<void> {
    const item = game.actors.get(actorId).items.get(itemId);
    const itemSettings = this.getItemSettings(item);
    if (itemSettings.isIdentifiable) {
      await this.setItemSettings(item, {
        ...itemSettings,
        isIdentified: value
      });
    } else {
      await item.setFlag(staticValues.moduleName, 'revealed', value);
    }
  }

  public getAbilitiesFromActor(actorId: string): IdentifiableAbility[] {
    const actor = game.actors.get(actorId);

    return Array.from(actor.items)
      .map(item => {
        const itemSettings = this.getItemSettings(item);
        return {
          item: item,
          settings: itemSettings
        };
      })
      .filter(item => item.settings.isIdentifiable)
      .sort((a, b) => a.item.name.localeCompare(b.item.name))
      .map((item) => {
        return {
          actorId: actorId,
          ownedItemId: item.item.id,
          name: item.item.name,
          img: item.item.img,
          htmlDescription: item.item.data?.data?.description?.value ? item.item.data.data.description.value : '',
          hideOriginalName: !item.settings.isIdentified && item.settings.unidentifiedName != null,
          unidentifiedName: item.settings.unidentifiedName,
          showHtmlDescription: item.settings.isIdentified,
          showImg: item.settings.isIdentified,
          revealed: item.settings.isIdentified,
          checked: item.settings.isIdentified,
          disabled: item.settings.isIdentified,
        };
      });
  }

  public async getAbilitiesHtml(abilities: IdentifiableAbility[], options: {enrich?: { secrets: boolean, entities: boolean, links: boolean, rolls: boolean, rollData: boolean }} = {}): Promise<string> {
    const html: string = await (renderTemplate(`modules/${staticValues.moduleName}/templates/identifiable-abilities.hbs`, {
      items: abilities
    }) as any);
    if (options.enrich) {
      return TextEditor.enrichHTML(html, options.enrich);
    } else {
      return TextEditor.enrichHTML(html);
    }
  }
  
  public async openSettings(item: Item): Promise<void> {
    const itemSettings = this.getItemSettings(item);
    const html: string = await (renderTemplate(`modules/${staticValues.moduleName}/templates/identifiable-settings.hbs`, itemSettings) as any);
    
    const dialog = new Dialog({
      title: item.name,
      content: html,
      buttons: {
        save: {
          label: 'Save',
          callback: async () => {
            const element: HTMLElement = dialog.element instanceof HTMLElement ? dialog.element : dialog.element[0];
            const isIdentifiable = (element.querySelector(':scope #knowledge-check-is-identifiable') as HTMLInputElement).checked;
            const isIdentified = (element.querySelector(':scope #knowledge-check-is-identified') as HTMLInputElement).checked;
            const unidentifiedName = (element.querySelector(':scope #knowledge-check-unidentified-name') as HTMLInputElement).value;
            this.setItemSettings(item, {
              isIdentifiable: isIdentifiable,
              isIdentified: isIdentified,
              unidentifiedName: unidentifiedName == null || unidentifiedName.length === 0 ? '' : unidentifiedName
            });
            dialog.close();
          }
        }
      },
    });
    dialog.render(true);
  }
  
  public async printAbilities(actorId: string, overrides: {abilities?: IdentifiableAbility[]} = {}): Promise<void> {
    const actor = game.actors.get(actorId);
    const htmlTemplate: string = await this.getAbilitiesHtml(overrides.abilities ? overrides.abilities : this.getAbilitiesFromActor(actorId));

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: htmlTemplate,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      user: game.userId
    });
  
    return new Promise(resolve => {
      if (game.user.hasRole(CONST.USER_ROLES.GAMEMASTER)) {
        // Allow GM to 'un reveal' abilities
        setTimeout(() => {
          document.querySelectorAll(`[data-message-id="${message.id}"] .message-content input`).forEach((input: HTMLInputElement) => {
            input.disabled = false;
          });
          resolve(null);
        }, 0);
      } else {
        resolve(null);
      }
    });
  }

  public async updateAbilityMessage(messageId: string, actorId: string, overrides: {abilities?: IdentifiableAbility[]} = {}): Promise<void> {
    this.updateAbilityMessageLocal(messageId, actorId, overrides, true);
    const socket = await provider.getSocket();
    return await socket.executeAsGM('updateAbilityMessage', messageId, actorId, overrides, false);
  }

  private async updateAbilityMessageLocal(messageId: string, actorId: string, overrides: {abilities?: IdentifiableAbility[]} = {}, htmlOnly: boolean): Promise<void> {
    const htmlTemplate: string = await this.getAbilitiesHtml(overrides.abilities ? overrides.abilities : this.getAbilitiesFromActor(actorId));

    if (htmlOnly) {
      document.querySelector(`[data-message-id="${messageId}"] .message-content`).innerHTML = htmlTemplate;
    } else {
      await ChatMessage.update({
        _id: messageId,
        content: htmlTemplate
      });
    }

  }

  private getItem(itemId: ItemId): Item {
    if (itemId instanceof Item) {
      itemId = {
        itemId: itemId.id,
        actorId: itemId.actor?.id
      };
    }
    if (itemId.actorId) {
      return game.actors.get(itemId.actorId).items.get(itemId.itemId);
    } else {
      return game.items.get(itemId.itemId);
    }
  }

}