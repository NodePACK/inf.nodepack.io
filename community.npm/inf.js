
'use strict';

let queue = null;

class Packer {

    constructor (INF, ALIAS) {
        const self = this;

        const SEMVER = require("semver");

        self.props = {};

        function cachePathForPack (toolchain, pack) {
            INF.LIB.ASSERT(self.props.cache instanceof INF.LIB.INF.Node, "No 'cache' property set!");
            return INF.LIB.PATH.join(
                self.props.cache.toPath(),
                'io.nodepack.inf/community.npm',
                pack.value.name,
                `${((pack.value.stream) ? `v${pack.value.stream}_`: '')}${process.version.split(".")[0]}_${process.platform}_${process.arch}`
            );
        }

        async function ensurePackAspectAt (toolchain, pack, aspect, targetPath) {

            INF.LIB.ASSERT(pack instanceof INF.LIB.INF.Node, "No 'pack' property set!");
            INF.LIB.ASSERT(pack.value.name, "No 'pack.name' property set!");

            async function ensure (aspects, aspectCachePath) {

                return (queue = Promise.resolve(queue).then(async function () {

                    // If there is a descriptor property we ensure that the pack matches the descriptor
                    if (pack.value.descriptor) {

                        var expectedDescriptorPath = null;
                        var expectedDescriptor = null;
                        if (typeof pack.value.descriptor === "string") {
                            expectedDescriptorPath = pack.propertyToPath('descriptor');
                            expectedDescriptor = await INF.LIB.FS.readJSONAsync(expectedDescriptorPath);
                        } else {
                            expectedDescriptor = pack.value.descriptor;
                        }

                        if (expectedDescriptor.name) {
                            INF.LIB.ASSERT.equal(pack.value.name, expectedDescriptor.name, "'pack.name' property does not equal 'descriptor.name' property!");
                        }

                        if (pack.value.stream) {
                            if (!SEMVER.satisfies(expectedDescriptor.version, `~${pack.value.stream}`)) {
                                throw new Error(`Descriptor version '${expectedDescriptor.version}' does not satisfy stream selector '~${pack.value.stream}'!`);
                            }
                        }

                        var aspectDescriptor = {
                            name: pack.value.name,
                            version: expectedDescriptor.version || '0.0.0'
                        };
                        aspects.forEach(function (aspect) {
                            if (!expectedDescriptor[aspect]) return;
                            aspectDescriptor[aspect] = expectedDescriptor[aspect];
                            aspectDescriptor.bundledDependencies = (aspectDescriptor.bundledDependencies || []).concat(Object.keys(aspectDescriptor[aspect]));
                        });
   
                        const descriptorHashPath = INF.LIB.PATH.join(aspectCachePath, ".~package.json.hash");
    
                        let existingDescriptorHash = null;
                        if (await INF.LIB.FS.existsAsync(descriptorHashPath)) {
                            existingDescriptorHash = await INF.LIB.FS.readFileAsync(descriptorHashPath, "utf8");
                        }

                        var expectedDescriptorHash = INF.LIB.CRYPTO.createHash('sha1').update(INF.LIB.STABLE_JSON.stringify(aspectDescriptor)).digest('hex');
        
                        if (expectedDescriptorHash === existingDescriptorHash) {
                            // Identical build already installed.
                            return true;
                        }

                        // Expected does not exactly match existing so we ensure that expected is newer than existing to continue.

                        const aspectDescriptorPath = INF.LIB.PATH.join(aspectCachePath, 'package.json');
                        if (await INF.LIB.FS.existsAsync(aspectDescriptorPath)) {
                            const existingAspectDescriptor = await INF.LIB.FS.readJSONAsync(aspectDescriptorPath);
    
                            if (SEMVER.lte(aspectDescriptor.version, existingAspectDescriptor.version)) {
                                // Same or newer version already exists.
                                return true;
                            }
                        }
                    } else {
                        // There is no descriptor so we ensure the cache exists based on a stream selector

                        if (!pack.value.stream) {
                            throw new Error("If the 'descriptor' property is not set, the 'stream' property must be set!");
                        }

                        if (await INF.LIB.FS.existsAsync(aspectCachePath)) {
                            // The cache exists based on the stream selector which is enough
                            return true;
                        }

                        throw new Error(`Cannot install pack '${pack.value.name}' at '${aspectCachePath}' because there is no 'descriptor' property specified!`);
                    }

                    console.log("[io.nodepack.inf/communit.npm]", `Updating '${aspectCachePath}' from pack '${pack.value.name}'`);

                    const tmpAspectCachePath = INF.LIB.PATH.join(aspectCachePath, "..", `.~${INF.LIB.PATH.basename(aspectCachePath)}~${Date.now()}`);

                    await INF.LIB.FS.outputFileAsync(INF.LIB.PATH.join(tmpAspectCachePath, ".~package.json.hash"), expectedDescriptorHash, "utf8");
                    await INF.LIB.FS.outputFileAsync(INF.LIB.PATH.join(tmpAspectCachePath, 'package.json'), JSON.stringify(aspectDescriptor, null, 4), 'utf8');

                    let sourceShrinwrapFile = (expectedDescriptorPath && INF.LIB.PATH.join(expectedDescriptorPath, "..", "npm-shrinkwrap.json")) || null;
                    if (sourceShrinwrapFile && await INF.LIB.FS.existsAsync(sourceShrinwrapFile)) {
                        await INF.LIB.FS.copyFileAsync(sourceShrinwrapFile, INF.LIB.PATH.join(tmpAspectCachePath, "npm-shrinkwrap.json"));
                    }
    
                    function runCommand (command, args) {
                        return new Promise(function (resolve, reject) {

                            if (INF.LIB.verbose) console.log(`[io.nodepack.inf/communit.npm] Running '${command} ${args.join(' ')}' at '${tmpAspectCachePath}'`);

                            const proc = INF.LIB.CHILD_PROCESS.spawn(command, args, {
                                cwd: tmpAspectCachePath,
                                stdio: 'inherit',
                                env: ((function () {
                                    const env = {};
                                    Object.keys(process.env).forEach(function (name) {
                                        if (/^npm_/.test(name)) {
                                            return;
                                        }
                                        env[name] = process.env[name];
                                    });
                                    return env;
                                })())
                            });
                            proc.on('close', (code) => {
                                // TODO: Retry on error?
                                if (code != 0) return reject(new Error(`There was an error while running '${command} ${args.join(' ')}' at '${tmpAspectCachePath}'!`));
                                resolve();
                            });            
                        });
                    }
    
                    await runCommand('npm', [ 'install' ]);
                    await runCommand('npm', [ 'shrinkwrap' ]);
    
                    // TODO: Pack & upload if nodesync is enabled
                    //await runCommand('npm', [ 'pack' ]);                    

                    if (await INF.LIB.FS.existsAsync(aspectCachePath)) {
                        await INF.LIB.FS.removeAsync(aspectCachePath);
                    }

                    return INF.LIB.FS.moveAsync(tmpAspectCachePath, aspectCachePath);
                }));
            }

            if (aspect === 'dependencies') {
                return ensure(['dependencies'], targetPath);
            } else
            if (aspect === 'devDependencies') {
                return ensure(['dependencies', 'devDependencies'], targetPath);
            }
            throw new Error(`Unknown aspect '${aspect}'!`);
        }

        self.invoke = async function (pointer, value) {

            if (/^\.\[\]/.test(pointer)) {
                self.props[pointer.substring(3)] = (self.props[pointer.substring(3)] || []).concat([value]);
                return true;
            } else
            if (/^\./.test(pointer)) {
                self.props[pointer.substring(1)] = value;
                return true;
            } else
            if (pointer === "contract") {

                const toolchain = value.value;

                return INF.LIB.Promise.mapSeries(self.props.pack, async function (pack) {

                    INF.LIB.ASSERT(pack.value.name, "No 'pack.name' property set!");

                    if (INF.LIB.verbose) console.log(`[io.nodepack.inf/communit.npm] Contract pack '${pack.value.name}'`);

                    const cachePath = cachePathForPack(toolchain, pack);

                    if (pack.value.aspect) {
                        return ensurePackAspectAt(toolchain, pack, pack.value.aspect, INF.LIB.PATH.join(cachePath, pack.value.aspect));
                    }

                    await ensurePackAspectAt(toolchain, pack, 'dependencies', INF.LIB.PATH.join(cachePath, 'dependencies'));
                    await ensurePackAspectAt(toolchain, pack, 'devDependencies', INF.LIB.PATH.join(cachePath, 'devDependencies'));
                });

            } else
            if (pointer === "expand") {
                const toolchain = value.value;

                return INF.LIB.Promise.mapSeries(self.props.pack, async function (pack) {

                    INF.LIB.ASSERT(pack instanceof INF.LIB.INF.Node, "No 'pack' property set!");
                    INF.LIB.ASSERT(pack.value.name, "No 'pack.name' property set!");

                    if (INF.LIB.verbose) console.log(`[io.nodepack.inf/communit.npm] Expand pack '${pack.value.name}'`);

                    INF.LIB.ASSERT(pack.value.basePath, "No 'pack.basePath' property set!");
                    INF.LIB.ASSERT(pack.value.aspect, "No 'pack.aspect' property set!");

                    const basePath = pack.propertyToPath("basePath");

                    async function ensurePackAspectCache () {
                        if (!self.props.cache) {
                            throw new Error("'.cache' not set!");
                        }

                        const cachePath = cachePathForPack(toolchain, pack);
                        const aspectCachePath = INF.LIB.PATH.join(cachePath, pack.value.aspect);
                            
                        await ensurePackAspectAt(toolchain, pack, pack.value.aspect, aspectCachePath);

                        return aspectCachePath;
                    }

                    if (
                        await INF.LIB.FS.existsAsync(basePath) &&
                        !(await INF.LIB.FS.statAsync(basePath)).isSymbolicLink()
                    ) {
                        // We are linking the pack to a package diretory that already exists for another purposes.
                        // So we ensure the package is in the cache and then
                        // link the 'node_modules/.bin' commands and write a pointer file to indicate
                        // that the nodepack has been "installed".

                        const installedDescriptorPath = INF.LIB.PATH.join(basePath, '.~_#_io.nodepack.inf_#_installed1.json');
                        let installedDescriptor = (await INF.LIB.FS.existsAsync(installedDescriptorPath)) ?
                            await INF.LIB.FS.readJSONAsync(installedDescriptorPath) :
                            {};

                        const installedDescriptorPointer = ['packs', pack.value.name, pack.value.stream, pack.value.aspect];
                        const existingPointerValue = INF.LIB.LODASH.get(installedDescriptor, installedDescriptorPointer);
                        if (
                            existingPointerValue &&
                            await INF.LIB.FS.existsAsync(existingPointerValue)
                        ) {
                            // Already installed. No need to link bin files again.
                            return true;
                        }

                        const aspectCachePath = await ensurePackAspectCache();

                        INF.LIB.LODASH.set(installedDescriptor, installedDescriptorPointer, aspectCachePath);

                        /*
                        //TODO: Only link bin paths if configured to do so
                        const cacheBinPath = INF.LIB.PATH.join(aspectCachePath, 'node_modules', '.bin');
                        const targetBinPath = INF.LIB.PATH.join(basePath, 'node_modules', '.bin');

                        if (await INF.LIB.FS.existsAsync(cacheBinPath)) {
                            const binCommands = await INF.LIB.FS.readdirAsync(cacheBinPath);
                            if (binCommands.length) {

                                if (!await INF.LIB.FS.existsAsync(targetBinPath)) {
                                    INF.LIB.FS.mkdirsAsync(targetBinPath);
                                }

                                await INF.LIB.Promise.map(binCommands, async function (name) {

                                    const sourcePath = INF.LIB.PATH.join(cacheBinPath, name);
                                    const targetPath = INF.LIB.PATH.join(targetBinPath, [
                                        pack.value.name,
                                        pack.value.stream,
                                        pack.value.aspect,
                                        name
                                    ].join('~'));

                                    if (await INF.LIB.FS.existsAsync(targetPath)) {
                                        if (!(await INF.LIB.FS.statAsync(targetPath)).isSymbolicLink()) {
                                            // A non symlink command exists which we do not replace.
                                            return true;
                                        }
                                        if (await INF.LIB.FS.readlinkAsync(targetPath) === sourcePath) {
                                            // Exact symlink already exists
                                            return true;
                                        }
                                        // Update symlink
                                        await INF.LIB.FS.removeAsync(targetPath);
                                    }
                                    return INF.LIB.FS.symlinkAsync(sourcePath, targetPath);
                                });
                            }                            
                        }
                        */

                        await INF.LIB.FS.outputFileAsync(installedDescriptorPath, INF.LIB.STABLE_JSON.stringify(installedDescriptor, null, 4), "utf8");

                        return true;
                    }

                    // We are linking the pack into a dedicated directory.

                    if (self.props.cache) {
                        // Link from cache

                        const aspectCachePath = await ensurePackAspectCache();

                        if (await INF.LIB.FS.existsAsync(basePath)) {
                            // If not a symlink we do not touch
                            if (!(await INF.LIB.FS.statAsync(basePath)).isSymbolicLink()) {
                                return true;
                            }
                            if (await INF.LIB.FS.readlinkAsync(basePath) === aspectCachePath) {
                                // Already linked to expected path in cache.
                                return true;
                            }
                            await INF.LIB.FS.removeAsync(basePath);
                        }

                        console.log("[io.nodepack.inf/communit.npm]", `Linking '${aspectCachePath}' to '${basePath}'`);

                        return INF.LIB.FS.symlinkAsync(aspectCachePath, basePath);

                    } else {
                        // Install directly into target path

                        return ensurePackAspectAt(toolchain, pack, pack.value.aspect, basePath);
                    }
                });
            }
        };
    }

}

exports.inf = async function (INF, ALIAS) {
    const packer = new Packer(INF, ALIAS);
    return packer;
}
