import { staticValues } from "./static-values.js"

interface IdentifiableAbility {
  actorId: string;
  ownedItemId: string;
  name: string;
  img: string;
  revealed: boolean;
}

function isRelevantItem(item: Item<any>): boolean {
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

async function getAbilitiesHtml(actorId: string): Promise<string> {
  const actor = game.actors.get(actorId);

  const identifiableAbilities: IdentifiableAbility[] = Array.from(actor.items)
    .filter(item => isRelevantItem(item))
    .sort((a: Item, b: Item) => a.name.localeCompare(b.name))
    .map((item: Item<any>) => {
      return {
        actorId: actorId,
        ownedItemId: item.id,
        name: item.name,
        img: item.img,
        revealed: item.data.data.identified
      }
    });

  return await (renderTemplate(`modules/${staticValues.moduleName}/templates/identifiable-abilities.hbs`, {
    items: identifiableAbilities
  }) as any);
}

async function printAbilities(actorId: string): Promise<void> {
  const actor = game.actors.get(actorId);
  const htmlTemplate: string = await getAbilitiesHtml(actorId);

  return await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor: actor}),
    content: htmlTemplate,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    user: game.userId
  }).then(() => null);
}

Hooks.on('init', () => {
  game[staticValues.moduleName] = {
    printAbilities: printAbilities
  }
});

Hooks.on('ready', () => {
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

        // TODO update item to be revealed
        ChatMessage.update({
          _id: messageId,
          content: messageRoot.querySelector('.message-content').innerHTML
        });
      }
    }

  })
});

Hooks.on('renderItemSheet', (arg1: any, html: JQuery, itemSheetData: any) => {
  const itemData = itemSheetData.item;
  console.log({arg1, html, itemSheetData})
})