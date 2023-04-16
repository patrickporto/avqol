import debugModule from "./debug/debug.module";

type Module = {
    hooks: {
        init?: () => Promise<void>;
        ready?: () => Promise<void>;
    }
}

const modules: Module[] = [debugModule];

Hooks.on("init", async() => {
    for(const module of modules) {
        if(module?.hooks?.init) {
            await module.hooks.init();
        }
    }
});

Hooks.on("ready", async() => {
    for(const module of modules) {
        if(module?.hooks?.ready) {
            await module.hooks.ready();
        }
    }
});
