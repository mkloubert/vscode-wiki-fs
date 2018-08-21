'use strict';

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

import * as _ from 'lodash';
import * as ego_wikifs_fs from './fs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as vscode_helpers from 'vscode-helpers';

/**
 * A key value paris.
 */
export type KeyValuePairs<TValue = any> = { [key: string]: TValue };

let extension: vscode.ExtensionContext;
let isDeactivating = false;
const KEY_PARAMS = 'params';
let outputChannel: vscode.OutputChannel;
let packageFile: vscode_helpers.PackageFile;

export async function activate(context: vscode.ExtensionContext) {
    extension = context;
    vscode_helpers.setExtensionRoot(__dirname);

    const WF = vscode_helpers.buildWorkflow();

    // package file
    WF.next(async () => {
        try {
            packageFile = await vscode_helpers.getPackageFile();
        } catch { }
    });

    // output channel
    WF.next(() => {
        context.subscriptions.push(
            outputChannel = vscode.window.createOutputChannel('[e.GO] Wiki FileSystem')
        );

        outputChannel.hide();
    });

    // extension information
    WF.next(() => {
        const NOW = vscode_helpers.now();

        if (packageFile) {
            outputChannel.appendLine(`${packageFile.displayName} (${packageFile.name}) - v${packageFile.version}`);
        }

        outputChannel.appendLine(`Copyright (c) 2018-${NOW.format('YYYY')}  e.GO Digital GmbH, Aachen, Germany`);
        outputChannel.appendLine('');
        outputChannel.appendLine('GitHub : https://github.com/egodigital/vscode-wiki-fs/');
        outputChannel.appendLine('Web: https://e-go-digital.com/');

        outputChannel.appendLine('');
        outputChannel.appendLine('Initializing ...');
        outputChannel.appendLine('');
    });

    WF.next(() => {
        try {
            outputChannel.append("    Register 'wiki' file system scheme ... ");

            ego_wikifs_fs.WikiFileSystemProvider.register(
                context
            );

            outputChannel.appendLine('[OK]');
        } catch (e) {
            outputChannel.appendLine(`[ERROR: '${ vscode_helpers.toStringSafe(e) }']`);
        }
    });

    WF.next(() => {
        outputChannel.appendLine('');
        outputChannel.appendLine('Extension has been initialized.');
        outputChannel.appendLine('');
    });

    if (!isDeactivating) {
        await WF.start();
    }
}

export function deactivate() {
    if (isDeactivating) {
        return;
    }
    isDeactivating = true;
}

/**
 * Returns the parameters of an URI.
 *
 * @param {vscode.Uri} uri The URI.
 *
 * @return {KeyValuePairs<string>} The extracted / loaded parameters.
 */
export function getUriParams(uri: vscode.Uri): KeyValuePairs<string> {
    if (_.isNil(uri)) {
        return <any>uri;
    }

    const URI_PARAMS = uriParamsToObject(uri);

    const PARAMS: KeyValuePairs<string> = {};
    const APPLY_PARAMS = (paramsAndValues: any) => {
        if (_.isNil(paramsAndValues)) {
            return;
        }

        for (const P in paramsAndValues) {
            const PARAM_KEY = vscode_helpers.normalizeString(P);

            if (PARAM_KEY !== KEY_PARAMS) {
                PARAMS[ PARAM_KEY ] = vscode_helpers.toStringSafe( paramsAndValues[P] );
            }
        }
    };

    // first the explicit ones
    APPLY_PARAMS( URI_PARAMS );

    // now from external JSON file?
    let paramsFile = vscode_helpers.toStringSafe( URI_PARAMS[KEY_PARAMS] );
    if (!vscode_helpers.isEmptyString(paramsFile)) {
        if (!path.isAbsolute(paramsFile)) {
            paramsFile = path.join(
                os.homedir(), paramsFile
            );
        }

        paramsFile = path.resolve(paramsFile);

        APPLY_PARAMS(
            JSON.parse(
                fs.readFileSync(paramsFile, 'utf8')
            )
        );
    }

    // we do not need the 'params' parameter anymore
    delete PARAMS[ KEY_PARAMS ];

    return PARAMS;
}

/**
 * Shows an error popup.
 *
 * @param {any} err The error to show.
 */
export async function showError(err): Promise<string | undefined> {
    if (err) {
        return await vscode.window.showErrorMessage(
            `ERROR: ${ vscode_helpers.toStringSafe(err) }`
        );
    }
}

function uriParamsToObject(u: vscode.Uri): KeyValuePairs<string> {
    if (_.isNil(u)) {
        return <any>u;
    }

    let params: any;
    if (!vscode_helpers.isEmptyString(u.query)) {
        // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
        params = u.query.replace(/(^\?)/, '')
                        .split("&")
                        .map(function(n) { return n = n.split("="), this[vscode_helpers.normalizeString(n[0])] =
                                                                    vscode_helpers.toStringSafe(decodeURIComponent(n[1])), this; }
                        .bind({}))[0];
    }

    return params || {};
}
