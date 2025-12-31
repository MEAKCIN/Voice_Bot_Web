export class WebSocketService {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.onOpen = null;
        this.onClose = null;
        this.onMessage = null;
        this.onError = null;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        this.ws = new WebSocket(this.url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
            console.log("WS Connected");
            if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = (event) => {
            if (this.onMessage) this.onMessage(event);
        };

        this.ws.onclose = () => {
            console.log("WS Disconnected");
            if (this.onClose) this.onClose();
        };

        this.ws.onerror = (error) => {
            console.error("WS Error", error);
            if (this.onError) this.onError(error);
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            console.warn("WebSocket is not open. Cannot send data.");
        }
    }

    sendConfig(lang) {
        this.send(JSON.stringify({ type: "config", lang }));
    }

    close() {
        if (this.ws) this.ws.close();
    }

    isOpen() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
