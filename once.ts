function once<T>(eventTarget: EventTarget, eventName: string): Promise<T>{
    return new Promise<T>((resolve) => {
        eventTarget.addEventListener(eventName, (event) => {
            resolve(event as unknown as T);
        }, { once: true });
    }
    );
}

export { once };