// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import type { DeriveAccountRegistration, DeriveBalancesAll } from '@polkadot/api-derive/types';
import type { AccountJson, AccountWithChildren } from '@polkadot/extension-base/background/types';
import type { Chain } from '@polkadot/extension-chains/types';
import type { IconTheme } from '@polkadot/react-identicon/types';
import type { SettingsStruct } from '@polkadot/ui-settings/types';
import type { KeypairType } from '@polkadot/util-crypto/types';

import { faUsb } from '@fortawesome/free-brands-svg-icons';
import { faCodeBranch, faQrcode, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ArrowForwardIosRounded as ArrowForwardIosRoundedIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import { Avatar, Grid, IconButton, Typography } from '@mui/material';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { AccountContext, ActionContext, SettingsContext } from '../../../extension-ui/src/components/contexts';
import Identicon from '../../../extension-ui/src/components/Identicon';
import Menu from '../../../extension-ui/src/components/Menu';
import useMetadata from '../../../extension-ui/src/hooks/useMetadata';
import useOutsideClick from '../../../extension-ui/src/hooks/useOutsideClick';
import useToast from '../../../extension-ui/src/hooks/useToast';
import useTranslation from '../../../extension-ui/src/hooks/useTranslation';
import { showAccount } from '../../../extension-ui/src/messaging';
import { DEFAULT_TYPE } from '../../../extension-ui/src/util/defaultType';
import getParentNameSuri from '../../../extension-ui/src/util/getParentNameSuri';
import { useApi, useEndpoint } from '../hooks';
import AccountDetail from './AccountDetail';
import AccountFeatures from './AccountFeatures';
import AccountIcons from './AccountIcons';
import { ShortAddress, ShowBalance } from '.'; // added for Plus

export interface Props {
  actions?: React.ReactNode;
  address?: string | null;
  children?: React.ReactNode;
  className?: string;
  genesisHash?: string | null;
  isExternal?: boolean | null;
  isHardware?: boolean | null;
  isHidden?: boolean;
  name?: string | null;
  parentName?: string | null;
  suri?: string;
  toggleActions?: number;
  type?: KeypairType;
  showPlus?: boolean;// added for plus
}

interface Recoded {
  account: AccountJson | null;
  formatted: string | null;
  genesisHash?: string | null;
  prefix?: number;
  type: KeypairType;
}

// find an account in our list
function findSubstrateAccount(accounts: AccountJson[], publicKey: Uint8Array): AccountJson | null {
  const pkStr = publicKey.toString();

  return accounts.find(({ address }): boolean =>
    decodeAddress(address).toString() === pkStr
  ) || null;
}

// find an account in our list
function findAccountByAddress(accounts: AccountJson[], _address: string): AccountJson | null {
  return accounts.find(({ address }): boolean =>
    address === _address
  ) || null;
}

// recodes an supplied address using the prefix/genesisHash, include the actual saved account & chain
function recodeAddress(address: string, accounts: AccountWithChildren[], chain: Chain | null, settings: SettingsStruct): Recoded {
  // decode and create a shortcut for the encoded address
  const publicKey = decodeAddress(address);

  // find our account using the actual publicKey, and then find the associated chain
  const account = findSubstrateAccount(accounts, publicKey);
  const prefix = chain ? chain.ss58Format : (settings.prefix === -1 ? 42 : settings.prefix);

  // always allow the actual settings to override the display
  return {
    account,
    formatted: account?.type === 'ethereum'
      ? address
      : encodeAddress(publicKey, prefix),
    genesisHash: account?.genesisHash,
    prefix,
    type: account?.type || DEFAULT_TYPE
  };
}

const ACCOUNTS_SCREEN_HEIGHT = 550;
const defaultRecoded = { account: null, formatted: null, prefix: 42, type: DEFAULT_TYPE };

export default function AccountPreview({ actions, address, children, className, genesisHash, isExternal, isHardware, isHidden, name, parentName, showPlus, suri, toggleActions, type: givenType }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const history = useHistory();

  const { accounts } = useContext(AccountContext);
  const settings = useContext(SettingsContext);
  const onAction = useContext(ActionContext);// added for plus
  const [{ account, formatted, genesisHash: recodedGenesis, prefix, type }, setRecoded] = useState<Recoded>(defaultRecoded);
  const chain = useMetadata(genesisHash || recodedGenesis, true);

  const endpoint = useEndpoint(accounts, address, chain);
  const api = useApi(endpoint);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [moveMenuUp, setIsMovedMenu] = useState(false);
  const actIconRef = useRef<HTMLDivElement>(null);
  const actMenuRef = useRef<HTMLDivElement>(null);

  const [identity, setIdentity] = useState<DeriveAccountRegistration | undefined>();
  const [balances, setBalances] = useState<DeriveBalancesAll | undefined>();
  const [recoverable, setRecoverable] = useState<boolean | undefined>();
  const { show } = useToast();

  useOutsideClick([actIconRef, actMenuRef], () => (showActionsMenu && setShowActionsMenu(!showActionsMenu)));

  useEffect((): void => {
    // eslint-disable-next-line no-void
    api && api.query?.recovery && api.query.recovery.recoverable(formatted).then((r) => r.isSome && setRecoverable(r.unwrap()));
  }, [api, formatted]);

  useEffect((): void => {
    if (!address) {
      return setRecoded(defaultRecoded);
    }

    const account = findAccountByAddress(accounts, address);

    setRecoded(
      (
        chain?.definition.chainType === 'ethereum' ||
        account?.type === 'ethereum' ||
        (!account && givenType === 'ethereum')
      )
        ? { account, formatted: address, type: 'ethereum' }
        : recodeAddress(address, accounts, chain, settings)
    );
  }, [accounts, address, chain, givenType, settings]);

  useEffect(() => {
    // eslint-disable-next-line no-void
    api && formatted && void api.derive.balances?.all(formatted).then((b) => {
      setBalances(b);
    });
  }, [api, formatted]);

  useEffect(() => {
    if (!showActionsMenu) {
      setIsMovedMenu(false);
    } else if (actMenuRef.current) {
      const { bottom } = actMenuRef.current.getBoundingClientRect();

      if (bottom > ACCOUNTS_SCREEN_HEIGHT) {
        setIsMovedMenu(true);
      }
    }
  }, [showActionsMenu]);

  useEffect((): void => {
    setShowActionsMenu(false);
  }, [toggleActions]);

  useEffect((): void => {
    // eslint-disable-next-line no-void
    api && formatted && void api.derive.accounts.info(formatted).then((info) => {
      console.log('info:', info);
      setIdentity(info?.identity);
    });
  }, [api, formatted]);

  const judgement = useMemo(
    () =>
      identity?.judgements && JSON.stringify(identity?.judgements).match(/reasonable|knownGood/gi)
    , [identity?.judgements]
  );

  const theme = (
    type === 'ethereum'
      ? 'ethereum'
      : (chain?.icon || 'polkadot')
  ) as IconTheme;

  const _onClick = useCallback(
    () => setShowActionsMenu(!showActionsMenu),
    [showActionsMenu]
  );

  const _onCopy = useCallback(
    () => show(t('Copied')),
    [show, t]
  );

  const _toggleVisibility = useCallback(
    (): void => {
      address && showAccount(address, isHidden || false).catch(console.error);
    },
    [address, isHidden]
  );

  const Name = () => {
    const accountName = name || account?.name;
    const displayName = identity?.display || accountName || t('<Unknown>');

    return (
      <>
        {!!accountName && (account?.isExternal || isExternal) && (
          (account?.isHardware || isHardware)
            ? (
              <FontAwesomeIcon
                className='hardwareIcon'
                icon={faUsb}
                rotation={270}
                title={t('hardware wallet account')}
              />
            )
            : (
              <FontAwesomeIcon
                className='externalIcon'
                icon={faQrcode}
                title={t('external account')}
              />
            )
        )}
        <span title={displayName}>{displayName}</span>
      </>);
  };

  const parentNameSuri = getParentNameSuri(parentName, suri);

  const goToAccount = useCallback(() => {
    // onAction(`/account/${genesisHash}/${address}/${formatted}/`);
    genesisHash && address && formatted && history.push({
      pathname: `/account/${genesisHash}/${address}/${formatted}/`,
      state: { api, balances, identity }
    });
  }, [balances, history, genesisHash, address, formatted, api, identity]);

  return (
    <Grid alignItems='center' container py='15px'>
      <AccountIcons
        address={formatted}
        identiconTheme={theme}
        prefix={prefix}
      />
      <AccountDetail address={formatted} name={name || account?.name} toggleVisibility={_toggleVisibility} chain={chain} />
      <AccountFeatures goOnClick={goToAccount} moreOnClick={_onClick} />
    </Grid>
  );
}