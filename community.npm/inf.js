
'use strict';

class Packer {

    constructor (INF, ALIAS) {
        const self = this;

        self.props = {};

        function cachePathForPack (toolchain, pack) {
            INF.LIB.ASSERT(self.props.cache instanceof INF.LIB.INF.Node, "No 'cache' property set!");
            return INF.LIB.PATH.join(
                self.props.cache.toPath(),
                'io.nodepack.inf/community.npm',
                pack.value.name,
                `${process.version}_${process.platform}_${process.arch}`
            );
        }

        async function constractPackAspect (toolchain, pack, aspect, targetPath) {

            INF.LIB.ASSERT(pack instanceof INF.LIB.INF.Node, "No 'pack' property set!");
            INF.LIB.ASSERT(pack.value.name, "No 'pack.name' property set!");

            INF.LIB.ASSERT(pack.value.descriptor, `No 'pack.descriptor' property set for pack with name '${pack.value.name}'!`);

            let descriptorPath = null;
            let descriptor = null;
            if (typeof pack.value.descriptor === "string") {
                descriptorPath = pack.propertyToPath('descriptor');
                descriptor = await INF.LIB.FS.readJSONAsync(descriptorPath);
            } else {
                descriptor = pack.value.descriptor;
            }

            async function constract (aspects, aspectCachePath) {
                const aspectDescriptor = {
                    name: descriptor.name || pack.value.name
                };
                aspects.forEach(function (aspect) {
                    if (!descriptor[aspect]) return;
                    aspectDescriptor[aspect] = descriptor[aspect];
                    aspectDescriptor.bundledDependencies = (aspectDescriptor.bundledDependencies || []).concat(Object.keys(aspectDescriptor[aspect]));
                });

                const sourceShrinwrapFile = (descriptorPath && INF.LIB.PATH.join(descriptorPath, "..", "npm-shrinkwrap.json")) || null;
                let sourceShrinkwrap = null;
                if (sourceShrinwrapFile && await INF.LIB.FS.existsAsync(sourceShrinwrapFile)) {
                    sourceShrinkwrap = await INF.LIB.FS.readJSONAsync(sourceShrinwrapFile);
                }

                const descriptorHashPath = INF.LIB.PATH.join(aspectCachePath, "descriptor.hash");

                let existingDescriptorHash = null;
                if (await INF.LIB.FS.existsAsync(descriptorHashPath)) {
                    existingDescriptorHash = await INF.LIB.FS.readFileAsync(descriptorHashPath, "utf8");
                }
                const descriptorHash = INF.LIB.CRYPTO.createHash('sha1').update([
                    INF.LIB.STABLE_JSON.stringify(aspectDescriptor),
                    (sourceShrinkwrap && INF.LIB.STABLE_JSON.stringify(sourceShrinkwrap)) || ""
                ].join(":")).digest('hex');

                if (descriptorHash === existingDescriptorHash) {
                    // Identical build already contracted.
                    // TODO: Ensure 'pack' ran if applicable.
                    return null;
                }

                console.log("[io.nodepack.inf/communit.npm]", `Updating '${aspectCachePath}' from pack '${pack.value.name}'`);

                if (await INF.LIB.FS.existsAsync(aspectCachePath)) {
                    await INF.LIB.FS.removeAsync(aspectCachePath);
                }

                await INF.LIB.FS.outputFileAsync(descriptorHashPath, descriptorHash, "utf8");

                aspectDescriptor.version = descriptor.version || `0.0.0-build.${descriptorHash.substring(0, 7)}`;
                if (Object.keys(aspectDescriptor).length === 0) return;

                const aspectDescriptorPath = INF.LIB.PATH.join(aspectCachePath, 'package.json');
                await INF.LIB.FS.outputFileAsync(aspectDescriptorPath, JSON.stringify(aspectDescriptor, null, 4), 'utf8');
                if (sourceShrinwrapFile && sourceShrinkwrap) {
                    await INF.LIB.FS.copyFileAsync(sourceShrinwrapFile, INF.LIB.PATH.join(aspectCachePath, "npm-shrinkwrap.json"));
                }

                function runCommand (command, args) {
                    return new Promise(function (resolve, reject) {
                        const proc = INF.LIB.CHILD_PROCESS.spawn(command, args, {
                            cwd: INF.LIB.PATH.dirname(aspectDescriptorPath),
                            stdio: 'inherit'
                        });
                        proc.on('close', (code) => {
                            // TODO: Retry on error?
                            if (code != 0) return reject(new Error(`There was an error while running '${command} ${args.join(' ')}' at '${INF.LIB.PATH.dirname(aspectDescriptorPath)}'!`));
                            resolve();
                        });            
                    });
                }

                await runCommand('npm', [ 'install' ]);

                // TODO: Pack & upload if nodesync is enabled
                //await runCommand('npm', [ 'pack' ]);
            }

            if (aspect === 'dependencies') {
                return constract(['dependencies'], targetPath);
            } else
            if (aspect === 'devDependencies') {
                return constract(['dependencies', 'devDependencies'], targetPath);
            }
            throw new Error(`Unknown aspect '${aspect}'!`);
        }

        self.invoke = async function (pointer, value) {

            if (/^\.\[\]/.test(pointer)) {
                self.props[pointer.substring(3)] = (self.props[pointer.substring(3)] || []).concat([value]);
            } else
            if (/^\./.test(pointer)) {
                self.props[pointer.substring(1)] = value;
            } else
            if (pointer === "contract") {

                const toolchain = value.value;

                return INF.LIB.Promise.map(self.props.pack, async function (pack) {

                    const cachePath = cachePathForPack(toolchain, pack);

                    return INF.LIB.Promise.all([
                        constractPackAspect(toolchain, pack, 'dependencies', INF.LIB.PATH.join(cachePath, 'dependencies')),
                        constractPackAspect(toolchain, pack, 'devDependencies', INF.LIB.PATH.join(cachePath, 'devDependencies'))
                    ]);
                });

            } else
            if (pointer === "expand") {
                const toolchain = value.value;

                return INF.LIB.Promise.map(self.props.pack, async function (pack) {

                    INF.LIB.ASSERT(pack instanceof INF.LIB.INF.Node, "No 'pack' property set!");
                    INF.LIB.ASSERT(pack.value.name, "No 'pack.name' property set!");
                    INF.LIB.ASSERT(pack.value.basePath, "No 'pack.basePath' property set!");
                    INF.LIB.ASSERT(pack.value.aspect, "No 'pack.aspect' property set!");

                    const basePath = pack.propertyToPath("basePath");
                    
                    if (self.props.cache) {
                        // Expand from cache

                        const cachePath = cachePathForPack(toolchain, pack);

                        const exists = await INF.LIB.FS.existsAsync(cachePath);
                        if (!exists) throw new Error("NYI: Cache path does not exist! TODO: Download package.");

                        const aspectCachePath = INF.LIB.PATH.join(cachePath, pack.value.aspect);

                        if (await INF.LIB.FS.existsAsync(basePath)) {

                            const existingDescriptorHashPath = INF.LIB.PATH.join(basePath, "descriptor.hash");
                            const newDescriptorHashPath = INF.LIB.PATH.join(aspectCachePath, "descriptor.hash");

                            if (await INF.LIB.FS.existsAsync(existingDescriptorHashPath)) {
                                if (await INF.LIB.FS.readFileAsync(newDescriptorHashPath, "utf8") === await INF.LIB.FS.readFileAsync(existingDescriptorHashPath, "utf8")) {
                                    // Identical build already expanded.
                                    return;
                                }
                            }

                            await INF.LIB.FS.removeAsync(basePath);
                        }

                        console.log("[io.nodepack.inf/communit.npm]", `Updating '${basePath}' from '${aspectCachePath}'`);

                        return INF.LIB.FS.copyAsync(aspectCachePath, basePath);
                    }

                    // Contract directly into target path

                    return constractPackAspect(toolchain, pack, pack.value.aspect, basePath);
                });
            }
        };
    }

}

exports.inf = async function (INF, ALIAS) {
    const packer = new Packer(INF, ALIAS);
    return packer;
}
