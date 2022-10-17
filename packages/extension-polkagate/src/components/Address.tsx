// Copyright 2019-2022 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AccountJson, AccountWithChildren } from '@polkadot/extension-base/background/types';
import type { Chain } from '@polkadot/extension-chains/types';
import type { IconTheme } from '@polkadot/react-identicon/types';
import type { SettingsStruct } from '@polkadot/ui-settings/types';
import type { KeypairType } from '@polkadot/util-crypto/types';

import { faCopy } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Grid, SxProps, Theme, Typography } from '@mui/material';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { useTranslation } from '../hooks';
import useMetadata from '../hooks/useMetadata';
import useToast from '../hooks/useToast';
import { DEFAULT_TYPE } from '../util/defaultType';
import { AccountContext, Identicon, SettingsContext } from './';

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
  style?: SxProps<Theme> | undefined;
  showCopy?: boolean;
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

const defaultRecoded = { account: null, formatted: null, prefix: 42, type: DEFAULT_TYPE };

function Address({ address, className, genesisHash, isExternal, isHardware, name, showCopy = true, style, type: givenType }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { accounts } = useContext(AccountContext);
  const settings = useContext(SettingsContext);
  const [{ formatted, genesisHash: recodedGenesis, prefix, type }, setRecoded] = useState<Recoded>(defaultRecoded);
  const chain = useMetadata(genesisHash || recodedGenesis, true);
  const accName = useMemo(() => {
    if (name || !accounts) {
      return;
    }

    return accounts.find((acc) => acc.address === address)?.name;
  }, [accounts, address, name]);

  const { show } = useToast();

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

  const theme = (
    type === 'ethereum'
      ? 'ethereum'
      : (chain?.icon || 'polkadot')
  ) as IconTheme;

  const _onCopy = useCallback(
    () => show(t('Copied')),
    [show, t]
  );

  return (
    <>
      <Grid
        className={className}
        container
        direction={'row'}
        justifyContent={'space-between'}
        sx={{
          backgroundColor: 'background.paper',
          border: '0.5px solid',
          borderColor: 'secondary.light',
          borderRadius: '5px',
          height: '70px',
          m: '20px auto',
          p: '14px 8px',
          width: '92%',
          ...style
        }}
      >
        <Grid
          item
          width='40px'
        >
          <Identicon
            className='identityIcon'
            iconTheme={theme}
            isExternal={isExternal}
            onCopy={_onCopy}
            prefix={prefix}
            size={40}
            value={formatted || address}
          />
        </Grid>
        <Grid
          container
          direction={'column'}
          item
          width='calc(95% - 40px)'
        >
          <Typography
            fontSize={'16px'}
            fontWeight={400}
            maxWidth='95%'
            overflow='hidden'
            variant='h3'
            whiteSpace='nowrap'
          >
            {accName || t('<unknown>')}
          </Typography>
          <Grid
            container
            direction={'row'}
            item
            justifyContent={'space-between'}
          >
            <Grid
              item
              maxWidth={'220px'}
              overflow={'hidden'}
              textOverflow={'ellipsis'}
              xs={showCopy ? 10 : 12}
            >
              <Typography
                fontSize={'10px'}
                fontWeight={300}
                letterSpacing={'-0.015em'}
                variant='overline'
              >
                {formatted || address || t('<unknown>')}
              </Typography>
            </Grid>
            {showCopy &&
              <Grid
                item
                pl={'5px'}
                xs={1.5}
              >
                <CopyToClipboard text={(formatted && formatted) || ''}>
                  <FontAwesomeIcon
                    className='copyIcon'
                    color={'#BA2882'}
                    cursor='pointer'
                    icon={faCopy}
                    onClick={_onCopy}
                    size='sm'
                    title={t('copy address')}
                  />
                </CopyToClipboard>
              </Grid>
            }
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default (Address);
