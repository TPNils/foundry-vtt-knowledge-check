import { Identifiable } from './identifiable.js';
import { ValueProvider } from './value-provider.js';

class Provider {

  constructor() {
    this.socket.get().then(socket => {
      this.getIdentifiable().registerSocket(socket);
    });
  }

  private identifiable = new ValueProvider<Identifiable>();
  public getIdentifiable(): Identifiable {
    if (!this.identifiable.isSet()) {
      switch (game.system.id) {
        default: 
          this.identifiable.set(new Identifiable());
      }
    }

    return this.identifiable.getSync();
  }

  private socket = new ValueProvider<SocketlibSocket>();
  public getSocket(): Promise<SocketlibSocket> {
    return this.socket.get();
  }

  public setSocket(socket: SocketlibSocket): void {
    this.socket.set(socket);
  }

}

export const provider = new Provider();