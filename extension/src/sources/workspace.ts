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

import * as ego_wikifs_fs from '../fs';
import * as vscode from 'vscode';

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
    public async createDirectory(uri: vscode.Uri): Promise<void> {
        throw new Error('Not Implemented');
    }

    /**
     * @inheritdoc
     */
    public async delete(uri: vscode.Uri, options: ego_wikifs_fs.DeleteOptions): Promise<void> {
        throw new Error('Not Implemented');
    }

    /**
     * @inheritdoc
     */
    public async readDirectory(uri: vscode.Uri): Promise<ego_wikifs_fs.DirectoryEntry[]> {
        throw new Error('Not Implemented');
    }

    /**
     * @inheritdoc
     */
    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        throw new Error('Not Implemented');
    }

    /**
     * @inheritdoc
     */
    public async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: ego_wikifs_fs.RenameOptions): Promise<void> {
        throw new Error('Not Implemented');
    }

    /**
     * @inheritdoc
     */
    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        throw new Error('Not Implemented');
    }

    /**
     * @inheritdoc
     */
    public async writeFile(uri: vscode.Uri, content: Uint8Array, options: ego_wikifs_fs.WriteFileOptions): Promise<void> {
        throw new Error('Not Implemented');
    }
}
