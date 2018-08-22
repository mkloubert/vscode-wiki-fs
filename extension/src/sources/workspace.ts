/**
 * This file is part of the vscode-wiki-fs distribution.
 * Copyright (c) e.GO Digital GmbH, Aachen, Germany (https://www.e-go-digital.com/)
 *
 * vscode-wiki-fs is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * vscode-wiki-fs is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as ego_wikifs from '../extension';
import * as ego_wikifs_fs from '../fs';
import * as fsExtra from 'fs-extra';
import * as moment from 'moment';
import * as path from 'path';
import * as vscode from 'vscode';
import * as vscode_helpers from 'vscode-helpers';

const QUEUE = vscode_helpers.createQueue();

/**
 * A basic file system provider.
 */
export class WorkspaceWikiSource extends ego_wikifs_fs.FileSystemBase {
    /**
     * Initializes a new instance of that class.
     *
     * @param {vscode.ExtensionContext} extension The underlying extension context.
     * @param {vscode.Uri} uri The URI.
     */
    public constructor(
        public readonly extension: vscode.ExtensionContext,
        public readonly uri: vscode.Uri
    ) {
        super();
    }

    /**
     * @inheritdoc
     */
    public createDirectory(uri: vscode.Uri): Promise<void> {
        return this.withWorkspace(uri, async (p) => {
            if (await vscode_helpers.exists(p)) {
                throw vscode.FileSystemError.FileExists(uri);
            }

            await fsExtra.mkdirs(p);
        });
    }

    /**
     * @inheritdoc
     */
    public delete(uri: vscode.Uri, options: ego_wikifs_fs.DeleteOptions): Promise<void> {
        return this.withWorkspace(uri, async (p) => {
            if (await vscode_helpers.exists(p)) {
                if (await vscode_helpers.isDirectory(p, false)) {
                    if (!options.recursive) {
                        if ((await fsExtra.readdir(p)).length > 0) {
                            throw vscode.FileSystemError.NoPermissions(uri);
                        }
                    }
                }

                await fsExtra.remove(p);
            }

            throw vscode.FileSystemError.FileNotFound(uri);
        });
    }

    /**
     * @inheritdoc
     */
    public readDirectory(uri: vscode.Uri): Promise<ego_wikifs_fs.DirectoryEntry[]> {
        return this.withWorkspace(uri, async (dir) => {
            if (await vscode_helpers.isDirectory(dir, false)) {
                const ITEMS: ego_wikifs_fs.DirectoryEntry[] = [];
                for (const ITEM of (await fsExtra.readdir(dir))) {
                    const STAT = await fsExtra.lstat(path.join(
                        dir, ITEM
                    ));

                    let type: vscode.FileType | false = vscode.FileType.Unknown;
                    let name = ITEM;
                    if (STAT.isDirectory()) {
                        type = vscode.FileType.Directory;
                    } else if (STAT.isFile()) {
                        if (!ITEM.endsWith('.md')) {
                            type = false;
                        } else {
                            name = ITEM.substr(0, ITEM.length - 3);
                            type = vscode.FileType.File;
                        }
                    } else if (STAT.isSymbolicLink()) {
                        type = vscode.FileType.SymbolicLink;
                    }

                    if (false !== type) {
                        ITEMS.push([
                            name, type
                        ]);
                    }
                }

                return vscode_helpers.from(
                    ITEMS
                ).orderBy(x => {
                    return vscode.FileType.Directory === x[1] ? 0 : 1;
                }).thenBy(x => {
                    return vscode_helpers.normalizeString(x[0]);
                }).toArray();
            } else {
                if (await vscode_helpers.exists(dir)) {
                    throw vscode.FileSystemError.FileNotADirectory(uri);
                }
            }

            throw vscode.FileSystemError.FileNotFound(uri);
        });
    }

    /**
     * @inheritdoc
     */
    public readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return this.withWorkspace(uri, async (file) => {
            file = file + '.md';

            if (await vscode_helpers.exists(file)) {
                if (await vscode_helpers.isFile(file, false)) {
                    return await fsExtra.readFile(file);
                }

                throw vscode.FileSystemError.FileIsADirectory(uri);
            }

            throw vscode.FileSystemError.FileNotFound(uri);
        });
    }

    /**
     * @inheritdoc
     */
    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: ego_wikifs_fs.RenameOptions): Promise<void> {
        return this.withWorkspace(oldUri, async (p, wr) => {
            let newFsPath = path.resolve(
                path.join(
                    wr, newUri.path
                )
            );

            if (await vscode_helpers.isFile(p, false)) {
                newFsPath += '.md';
            }

            if (newFsPath !== wr && !newFsPath.startsWith(wr + path.sep)) {
                throw vscode.FileSystemError.FileNotFound(newUri);
            }

            await fsExtra.rename(
                p, newFsPath
            );
        });
    }

    /**
     * @inheritdoc
     */
    public stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return this.withWorkspace(uri, async (p) => {
            if ('/' === uri.path) {
                return {
                    ctime: 0,
                    mtime: 0,
                    size: 0,
                    type: vscode.FileType.Directory,
                };
            }

            let ctime = 0;
            let mtime = 0;
            let size = 0;

            let pathToUse: string | false = false;
            if (await vscode_helpers.isDirectory(p, false)) {
                pathToUse = p;
            } else if (await vscode_helpers.exists(p + '.md')) {
                pathToUse = p + '.md';
            }

            if (false !== pathToUse) {
                const STAT = await fsExtra.lstat(pathToUse);
                const NAME = path.basename(pathToUse);

                ctime = vscode_helpers.asUTC(moment(STAT.ctime)).unix();
                mtime = vscode_helpers.asUTC(moment(STAT.mtime)).unix();

                let type: vscode.FileType | false = vscode.FileType.Unknown;
                if (STAT.isDirectory()) {
                    type = vscode.FileType.Directory;
                } else if (STAT.isFile()) {
                    if (!NAME.endsWith('.md')) {
                        type = false;
                    } else {
                        type = vscode.FileType.File;
                        size = STAT.size;
                    }
                } else if (STAT.isSymbolicLink()) {
                    type = vscode.FileType.SymbolicLink;
                    size = STAT.size;
                }

                if (false !== type) {
                    return {
                        ctime: ctime,
                        mtime: mtime,
                        size: size,
                        type: type,
                    };
                }
            }

            throw vscode.FileSystemError.FileNotFound(uri);
        });
    }

    private async withWorkspace<TResult = any>(
        u: vscode.Uri,
        action: (localPath: string, wikiRoot: string, workspace: vscode.WorkspaceFolder) => TResult | PromiseLike<TResult>,
    ) {
        return await QUEUE.add(async () => {
            const LOCAL_WORKSPACES = vscode_helpers.from(
                vscode_helpers.asArray(vscode.workspace.workspaceFolders)
            ).where(wsf => {
                return wsf.uri && [ '', 'file' ].indexOf(
                    vscode_helpers.normalizeString(wsf.uri.scheme)
                ) > -1;
            }).orderBy(wsf => {
                return wsf.index;
            }).thenBy(wsf => {
                return vscode_helpers.normalizeString(wsf.name);
            }).toArray();

            let selectedWorkspace: false | vscode.WorkspaceFolder = false;

            if (LOCAL_WORKSPACES.length > 0) {
                const WORKSPACE_NAME = vscode_helpers.normalizeString(this.uri.authority);
                if ('' === WORKSPACE_NAME) {
                    selectedWorkspace = LOCAL_WORKSPACES[0];
                } else {
                    selectedWorkspace = vscode_helpers.from(
                        LOCAL_WORKSPACES
                    ).singleOrDefault(wsf => {
                        return vscode_helpers.normalizeString(wsf.name) === WORKSPACE_NAME;
                    }, false);
                }
            }

            if (false === selectedWorkspace) {
                throw new Error('No matching workspace found');
            }

            const WIKI_ROOT = path.resolve(
                path.join(selectedWorkspace.uri.fsPath, '.vscode/.wiki')
            );
            if (!(await vscode_helpers.exists(WIKI_ROOT))) {
                await fsExtra.mkdirs(WIKI_ROOT);
            } else {
                if (!(await vscode_helpers.isDirectory(WIKI_ROOT, false))) {
                    throw new Error(`'${ WIKI_ROOT }' is no directory`);
                }
            }

            const FS_PATH = path.resolve(
                path.join(
                    WIKI_ROOT, u.path
                )
            );

            if (FS_PATH !== WIKI_ROOT && !FS_PATH.startsWith(WIKI_ROOT + path.sep)) {
                throw vscode.FileSystemError.FileNotFound(u);
            }

            return await Promise.resolve(
                action(
                    FS_PATH, WIKI_ROOT,
                    selectedWorkspace,
                )
            );
        });
    }

    /**
     * @inheritdoc
     */
    public writeFile(uri: vscode.Uri, content: Uint8Array, options: ego_wikifs_fs.WriteFileOptions): Promise<void> {
        return this.withWorkspace(uri, async (file) => {
            if (await vscode_helpers.isFile(file, false)) {
                if (!options.create) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                }

                if (!options.overwrite) {
                    throw vscode.FileSystemError.FileExists(uri);
                }
            }

            await vscode_helpers.createDirectoryIfNeeded(
                path.dirname(file)
            );

            await fsExtra.writeFile(
                file + '.md',
                content
            );
        });
    }
}
