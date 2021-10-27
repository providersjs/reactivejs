"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionReact = void 0;
const event_bus_1 = require("./event.bus");
function ActionReact(params) {
    return (target, propertyKey, descriptor) => {
        let fn;
        let patchedFn;
        if (descriptor) {
            fn = descriptor.value;
            params.cb = target[propertyKey];
            event_bus_1.EventBus.reactiveAttach(params);
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
                params.cb = newFn;
                event_bus_1.EventBus.reactiveAttach(params);
                fn = newFn;
            }
        };
    };
}
exports.ActionReact = ActionReact;
//# sourceMappingURL=action.decorator.js.map