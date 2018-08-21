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

import * as ego_wikifs from './extension';
import * as ego_wikifs_src_workspace from './sources/workspace';
import * as vscode from 'vscode';
import * as vscode_helpers from 'vscode-helpers';

/**
 * Options for 'delete()' method of a 'vscode.FileSystemProvider' object.
 */
export interface DeleteOptions {
    /**
     * Delete recursive or not.
     */
    recursive: boolean;
}

/**
 * A directory item.
 */
export type DirectoryEntry = [ string, vscode.FileType ];

/**
 * Options for 'rename()' method of a 'vscode.FileSystemProvider' object.
 */
export interface RenameOptions {
    /**
     * Overwrite existing target file or not.
     */
    overwrite: boolean;
}

/**
 * Options for 'writeFile()' method of a 'vscode.FileSystemProvider' object.
 */
export interface WriteFileOptions {
    /**
     * Create file if not exist.
     */
    create: boolean;
    /**
     * Overwrite file if exist.
     */
    overwrite: boolean;
}

/**
 * A basic file system provider.
 */
export abstract class FileSystemBase extends vscode_helpers.DisposableBase implements vscode.FileSystemProvider {
    private readonly _EVENT_EMITTER: vscode.EventEmitter<vscode.FileChangeEvent[]>;

    /**
     * Initializes a new instance of that class.
     */
    public constructor() {
        super();

        this._EVENT_EMITTER = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
        this.onDidChangeFile = this._EVENT_EMITTER.event;
    }

    /**
     * @inheritdoc
     */
    public abstract async createDirectory(uri: vscode.Uri);

    /**
     * @inheritdoc
     */
    public abstract async delete(uri: vscode.Uri, options: DeleteOptions);

    /**
     * @inheritdoc
     */
    public readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>;

    /**
     * @inheritdoc
     */
    public abstract async readDirectory(uri: vscode.Uri): Promise<DirectoryEntry[]>;

    /**
     * @inheritdoc
     */
    public abstract async readFile(uri: vscode.Uri): Promise<Uint8Array>;

    /**
     * @inheritdoc
     */
    public abstract async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: RenameOptions): Promise<void>;

    /**
     * @inheritdoc
     */
    public abstract async stat(uri: vscode.Uri): Promise<vscode.FileStat>;

    /**
     * @inheritdoc
     */
    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }) {
        return {
            dispose: function() {
                // dummy
            }
        };
    }

    /**
     * @inheritdoc
     */
    public abstract async writeFile(uri: vscode.Uri, content: Uint8Array, options: WriteFileOptions): Promise<void>;
}

/**
 * A wiki file system provider.
 */
export class WikiFileSystemProvider extends FileSystemBase {
    /**
     * Initializes a new instance of that class.
     *
     * @param {vscode.ExtensionContext} extension The underlying extension context.
     */
    public constructor(
        public readonly extension: vscode.ExtensionContext,
    ) {
        super();
    }

    /**
     * @inheritdoc
     */
    public createDirectory(uri: vscode.Uri) {
        return this.withUri(uri, (wiki) => {
            return wiki.createDirectory(uri);
        });
    }

    /**
     * @inheritdoc
     */
    public delete(uri: vscode.Uri, options: DeleteOptions) {
        return this.withUri(uri, (wiki) => {
            return wiki.delete(uri, options);
        });
    }

    private async getProviderByUri(uri: vscode.Uri) {
        let provider: FileSystemBase | false = false;

        try {
            const PARAMS = ego_wikifs.getUriParams(uri);

            const SOURCE = vscode_helpers.normalizeString(PARAMS['source']);
            switch (SOURCE) {
                case '':
                case 'p':
                case 'project':
                case 'workspace':
                case 'ws':
                    provider = new ego_wikifs_src_workspace.WorkspaceWikiSource(
                        this.extension, uri,
                    );
                    break;
            }
        } catch (e) {
            if (false !== provider) {
                vscode_helpers.tryDispose(provider);
            }

            throw e;
        }

        if (false === provider) {
            throw new Error('Wiki source not supported');
        }

        return provider;
    }

    /**
     * @inheritdoc
     */
    public readDirectory(uri: vscode.Uri) {
        return this.withUri(uri, (wiki) => {
            return wiki.readDirectory(uri);
        });
    }

    /**
     * @inheritdoc
     */
    public readFile(uri: vscode.Uri) {
        return this.withUri(uri, (wiki) => {
            return wiki.readFile(uri);
        });
    }

    /**
     * Registers a new instance of that file system provider for an extension.
     *
     * @param {vscode.ExtensionContext} context The context of the underlying extension.
     *
     * @return {WikiFileSystemProvider} The new instance.
     */
    public static register(context: vscode.ExtensionContext): WikiFileSystemProvider {
        const NEW_FS = new WikiFileSystemProvider(context);

        try {
            context.subscriptions.push(
                vscode.workspace.registerFileSystemProvider('wiki',
                                                            NEW_FS,
                                                            { isCaseSensitive: false })
            );
        } catch (e) {
            vscode_helpers.tryDispose(NEW_FS);

            throw e;
        }

        return NEW_FS;
    }

    /**
     * @inheritdoc
     */
    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: RenameOptions) {
        return this.withUri(oldUri, (wiki) => {
            return wiki.rename(oldUri, newUri, options);
        });
    }

    /**
     * @inheritdoc
     */
    public stat(uri: vscode.Uri) {
        return this.withUri(uri, (wiki) => {
            return wiki.stat(uri);
        });
    }

    private async withUri<TResult = any>(
        uri: vscode.Uri,
        action: (provider: vscode.FileSystemProvider) => TResult | PromiseLike<TResult>
    ): Promise<TResult> {
        try {
            const PROVIDER = await this.getProviderByUri(uri);
            try {
                return await Promise.resolve(
                    action(PROVIDER)
                );
            } finally {
                vscode_helpers.tryDispose(PROVIDER);
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * @inheritdoc
     */
    public writeFile(uri: vscode.Uri, content: Uint8Array, options: WriteFileOptions) {
        return this.withUri(uri, (wiki) => {
            return wiki.writeFile(uri, content, options);
        });
    }
}
