import { staticValues } from "./static-values.js";

export interface IdentifiableAbility {
  actorId: string;
  ownedItemId: string;
  name: string;
  img: string;
  revealed: boolean;
  checked: boolean;
  disabled: boolean;
}

export class Identifiable {

  public isIdentifiable(item: Item<any>): boolean {
    const isIdentifiable = item.getFlag(staticValues.moduleName, 'identifiable');
    if (isIdentifiable == null) {
      // fallback for dnd5e
      if (item.type === 'spell') {
        // what spells the character knows is still a secret and are usualy vanilla dnd spells
        return false;
      }
      if (item.type === 'weapon' || item.type === 'equipment' || item.type === 'feat') {
        if (item.data.data?.activation?.type != null && item.data.data?.activation?.type !== '') {
          return true;
        } else {
          return false;
        }
      }
      
      // (as fallback) Don't show the following
      // consumable, tool, loot, class, backpack
      return false;
    }
    
    switch (typeof isIdentifiable) {
      case 'boolean':
        return isIdentifiable;
      case 'bigint':
      case 'number':
        return isIdentifiable > 0;
      case 'string':
        if ('true' === isIdentifiable.toLowerCase()) {
          return true;
        }
        if ('false' === isIdentifiable.toLowerCase()) {
          return false;
        }
      default: 
        return !!isIdentifiable;
    }
  }

  public isManuallySet(item: Item<any>): boolean {
    return item.getFlag(staticValues.moduleName, 'identifiable') == null;
  }

  public async setIdentifiable(item: Item<any>, value: boolean | null): Promise<void> {
    if (value == null) {
      await item.unsetFlag(staticValues.moduleName, 'identifiable');
    } else {
      await item.setFlag(staticValues.moduleName, 'identifiable', value);
    }

    // Reset reveal, a 'it works well enough' solution to allow to reset something that was revealed
    if (!value) {
      const isRevealed = item.getFlag(staticValues.moduleName, 'revealed');
      if (isRevealed != null) {
        await this.setRevealed(item, null);
      }
    }
  }

  public isRevealed(item: Item<any>): boolean {
    const isRevealed = item.getFlag(staticValues.moduleName, 'revealed');
    
    switch (typeof isRevealed) {
      case 'boolean':
        return isRevealed;
      case 'bigint':
      case 'number':
        return isRevealed > 0;
      case 'string':
        if ('true' === isRevealed.toLowerCase()) {
          return true;
        }
        if ('false' === isRevealed.toLowerCase()) {
          return false;
        }
      default: 
        return !!isRevealed;
    }
  }

  public async setRevealed(item: Item<any>, value: boolean | null): Promise<void> {
    if (value == null) {
      await item.unsetFlag(staticValues.moduleName, 'revealed');
    } else {
      await item.setFlag(staticValues.moduleName, 'revealed', value);
    }
  }

  public getAbilitiesFromActor(actorId: string): IdentifiableAbility[] {
    const actor = game.actors.get(actorId);

    return Array.from(actor.items)
    .filter(item => this.isIdentifiable(item))
    .sort((a: Item, b: Item) => a.name.localeCompare(b.name))
    .map((item: Item<any>) => {
      const isRevealed = this.isRevealed(item);
      return {
        actorId: actorId,
        ownedItemId: item.id,
        name: item.name,
        img: item.img,
        revealed: isRevealed,
        checked: isRevealed,
        disabled: isRevealed,
      }
    });
  }

  public async getAbilitiesHtml(abilities: IdentifiableAbility[]): Promise<string> {
    return await (renderTemplate(`modules/${staticValues.moduleName}/templates/identifiable-abilities.hbs`, {
      items: abilities
    }) as any);
  }
  
  public async printAbilities(actorId: string, overrides: {abilities?: IdentifiableAbility[]} = {}): Promise<void> {
    const actor = game.actors.get(actorId);
    const htmlTemplate: string = await this.getAbilitiesHtml(overrides.abilities ? overrides.abilities : this.getAbilitiesFromActor(actorId));
  
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: htmlTemplate,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      user: game.userId
    }).then(() => null);
  }

  public async updateAbilityMessage(messageId: string, actorId: string, overrides: {abilities?: IdentifiableAbility[]} = {}): Promise<void> {
    const htmlTemplate: string = await this.getAbilitiesHtml(overrides.abilities ? overrides.abilities : this.getAbilitiesFromActor(actorId));

    await ChatMessage.update({
      _id: messageId,
      content: htmlTemplate
    });
  }

}