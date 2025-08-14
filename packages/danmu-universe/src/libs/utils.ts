class WidgetStorage {
  async getItem(key: string) {
    console.log("Widget.storage.getItem not supported yet");
  }

  async setItem(key: string, value: string) {
    console.log("Widget.storage.setItem not supported yet");
  }

  async removeItem(key: string) {
    console.log("Widget.storage.removeItem not supported yet");
  }

  async clear() {
    console.log("Widget.storage.clear not supported yet");
  }

  async keys() {
    console.log("Widget.storage.keys not supported yet");
  }
}

export const widgetStorage = new WidgetStorage();
