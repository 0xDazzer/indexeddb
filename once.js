// async function once<T>(eventTarget: EventTarget, eventName: string): Promise<T> {
//     // implementation goes here
// }

function once(eventTarget, eventName){
    return new Promise((resolve, reject) => {
        const callback = (e) => {
            eventTarget.removeEventListener(eventName, callback)
            resolve(e.detail)
        }
        eventTarget.addEventListener(eventName, callback)
    })
 };
