function once<T>(eventTarget: EventTarget, eventName: string): Promise<T>{
    const handler  = (resolve: (value: T | PromiseLike<T>) => void) => (event: T) => {
        console.log(`Event "${eventName}" occurred.`);
        resolve(event);
    };

    return new Promise<T>((resolve) => {
        eventTarget.addEventListener(eventName, (event) => handler(resolve)(event as T), { once: true });
    }
    );
}

export { once };