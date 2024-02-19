// Copyright 2019-2024 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AccountsContext, AuthorizeRequest, MetadataRequest, SigningRequest } from '@polkadot/extension-base/background/types';
import type { SettingsStruct } from '@polkadot/ui-settings/types';
import type { AccountsAssetsContextType, APIsContext, FetchingRequests, ReferendaContextType } from '../util/types';

import React from 'react';

import settings from '@polkadot/ui-settings';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noop = (): void => undefined;

const AccountContext = React.createContext<AccountsContext>({ accounts: [], hierarchy: [], master: undefined });
const APIContext = React.createContext<APIsContext>({ apis: {}, setIt: noop });
const ActionContext = React.createContext<(to?: string) => void>(noop);
const AuthorizeReqContext = React.createContext<AuthorizeRequest[]>([]);
const FetchingContext = React.createContext<FetchingRequests>({ fetching: {}, set: noop });
const ReferendaContext = React.createContext<ReferendaContextType>({ refs: {}, setRefs: noop });
const AccountsAssetsContext = React.createContext<AccountsAssetsContextType>({ accountsAssets: undefined, setAccountsAssets: noop });
const MediaContext = React.createContext<boolean>(false);
const MetadataReqContext = React.createContext<MetadataRequest[]>([]);
const SettingsContext = React.createContext<SettingsStruct>(settings.get());
const SigningReqContext = React.createContext<SigningRequest[]>([]);
const ToastContext = React.createContext<({ show: (message: string) => void })>({ show: noop });

export {
  AccountContext,
  ActionContext,
  APIContext,
  AuthorizeReqContext,
  FetchingContext,
  MediaContext,
  MetadataReqContext,
  ReferendaContext,
  AccountsAssetsContext,
  SettingsContext,
  SigningReqContext,
  ToastContext
};
