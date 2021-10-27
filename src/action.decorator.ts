import { EventBus } from "./event.bus";
import { IBusReactiveParams } from "./models/IBusReactiveParams";

export function ActionReact(params:IBusReactiveParams) {
  return (target: any, propertyKey: string, descriptor?: TypedPropertyDescriptor<any>):any => {

    let fn;
    let patchedFn;

    if (descriptor) {
      fn = descriptor.value;
      params.cb = target[propertyKey]
      EventBus.reactiveAttach(params);
    }

    return {
      configurable: true,
      enumerable: false,
      get() {
        if (!patchedFn) {
          patchedFn = (...args) => fn.call(this, ...args);
        }
        return patchedFn;
      },
      set(newFn) {
        patchedFn = undefined;
        params.cb = newFn
        EventBus.reactiveAttach(params);
        fn = newFn;
      }
    };
  }
}