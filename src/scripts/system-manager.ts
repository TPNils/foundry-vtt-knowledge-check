import { Identifiable } from "./identifiable.js";

export class SystemManager {
  public static getIdentifiable(): Identifiable {
    switch (game.system.id) {
      default: 
        return new Identifiable();
    }
  }
}