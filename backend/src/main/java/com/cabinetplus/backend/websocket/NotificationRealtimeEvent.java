package com.cabinetplus.backend.websocket;

public class NotificationRealtimeEvent {

    private String type;
    private Object payload;

    public NotificationRealtimeEvent(String type, Object payload) {
        this.type = type;
        this.payload = payload;
    }

    public String getType() {
        return type;
    }

    public Object getPayload() {
        return payload;
    }
}