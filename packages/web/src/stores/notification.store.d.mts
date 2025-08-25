export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}
export declare const useNotificationStore: import("pinia").StoreDefinition<"notification", Pick<{
    notifications: import("vue").Ref<{
        id: string;
        message: string;
        type: "success" | "error" | "info" | "warning";
        duration?: number | undefined;
    }[], Notification[] | {
        id: string;
        message: string;
        type: "success" | "error" | "info" | "warning";
        duration?: number | undefined;
    }[]>;
    addNotification: (notification: Omit<Notification, "id">) => void;
    removeNotification: (id: string) => void;
}, "notifications">, Pick<{
    notifications: import("vue").Ref<{
        id: string;
        message: string;
        type: "success" | "error" | "info" | "warning";
        duration?: number | undefined;
    }[], Notification[] | {
        id: string;
        message: string;
        type: "success" | "error" | "info" | "warning";
        duration?: number | undefined;
    }[]>;
    addNotification: (notification: Omit<Notification, "id">) => void;
    removeNotification: (id: string) => void;
}, never>, Pick<{
    notifications: import("vue").Ref<{
        id: string;
        message: string;
        type: "success" | "error" | "info" | "warning";
        duration?: number | undefined;
    }[], Notification[] | {
        id: string;
        message: string;
        type: "success" | "error" | "info" | "warning";
        duration?: number | undefined;
    }[]>;
    addNotification: (notification: Omit<Notification, "id">) => void;
    removeNotification: (id: string) => void;
}, "addNotification" | "removeNotification">>;
//# sourceMappingURL=notification.store.d.mts.map